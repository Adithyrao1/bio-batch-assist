---
name: hello-world
description: "Responds with 'Hello, World!' in ASCII art, system info, and a random cat fact. Use when the user says 'hello world'."

---

## Hello World Skill

When the user invokes the skill with "hello world", the following steps will be executed:

## Workflow

1. RUN [script](./scripts/get-system-info.py) to get system information.
2. Respond with "HELLO WORLD !" in ascii art 
3. Print all the system information obtained from the script.
4. RUN [script](./scripts/random-cat-fact.py) to get a random cat fact.
5. Print the information obtained from the script.
6. End the skill execution.