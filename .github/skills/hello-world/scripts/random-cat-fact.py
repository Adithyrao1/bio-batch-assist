import requests
import random

def get_random_cat_fact():
    """Fetch a random cat fact from the API."""
    try:
        response = requests.get("https://cat-fact.herokuapp.com/facts")
        response.raise_for_status()
        facts = response.json()
        random_fact = random.choice(facts)
        return random_fact.get("text", "No fact available")
    except requests.exceptions.RequestException as e:
        return f"Error fetching cat fact: {e}"

if __name__ == "__main__":
    fact = get_random_cat_fact()
    print(fact)