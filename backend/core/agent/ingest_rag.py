import os
import re
import tempfile
from pathlib import Path
from dotenv import load_dotenv

from azure.storage.blob import BlobServiceClient
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')

def get_connection_string():
    conn_str = os.environ.get('AZURE_STORAGE_CONNECTION_STRING')
    if conn_str:
        return conn_str
    
    account_name = os.environ.get('AZURE_ACCOUNT_NAME')
    account_key = os.environ.get('AZURE_ACCOUNT_KEY')
    if account_name and account_key:
        return f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={account_key};EndpointSuffix=core.windows.net"
    raise ValueError("Missing Azure Storage credentials in .env")

def clean_text(text: str) -> str:
    # Remove page number patterns like -3- or -16-
    text = re.sub(r'\n-\d+-\n', '\n', text)
    # Remove figure captions
    text = re.sub(r'Fig[\w\s]+:.*?\n', '', text)
    # Collapse excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def ingest_documents(blob_names, container_name):
    conn_str = get_connection_string()
    blob_service_client = BlobServiceClient.from_connection_string(conn_str)
    
    all_docs = []
    
    print(f"Connecting to container '{container_name}'...")
    
    for blob_name in blob_names:
        print(f"Downloading {blob_name}...")
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
        
        # Download to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(blob_client.download_blob().readall())
            tmp_path = tmp.name
            
        try:
            print(f"Parsing {blob_name}...")
            loader = PyMuPDFLoader(tmp_path)
            docs = loader.load()
            
            # Clean text
            for doc in docs:
                doc.page_content = clean_text(doc.page_content)
                # Ensure metadata source reflects the real file name
                doc.metadata['source'] = blob_name
                
            all_docs.extend(docs)
        finally:
            os.unlink(tmp_path)
            
    if not all_docs:
        print("No documents were loaded. Exiting.")
        return

    print(f"Splitting {len(all_docs)} pages...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", " "]
    )
    chunks = splitter.split_documents(all_docs)
    print(f"Generated {len(chunks)} chunks.")

    print("Initializing embeddings model (all-MiniLM-L6-v2)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    print("Building FAISS index...")
    vectorstore = FAISS.from_documents(chunks, embeddings)
    
    save_dir = Path(__file__).resolve().parent / "faiss_index"
    save_dir.mkdir(exist_ok=True)
    
    print(f"Saving FAISS index to {save_dir}...")
    vectorstore.save_local(str(save_dir))
    print("Ingestion complete!")

if __name__ == "__main__":
    # Documents to ingest
    DOCUMENTS = [
        "SOP-TCPF.pdf",
        "Plant_Tissue_Culture_laboratory_Project_Report.pdf"
    ]
    
    CONTAINER = os.environ.get("AZURE_CONTAINER", "profile-pictures")
    
    ingest_documents(DOCUMENTS, CONTAINER)
