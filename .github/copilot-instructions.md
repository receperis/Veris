# Copilot Agent Operational Instructions

These rules are mandatory for all code generated or modified by Copilot Agent in this project.

## General Coding Principles

- Write code that is **readable, maintainable, and well-structured**.
- Always follow the **DRY (Don’t Repeat Yourself) principle** to avoid redundancy.
- Use **descriptive and consistent variable, function, and class names**.
- Keep code **simple, concise, and clear**, prioritizing understandability over cleverness.
- Adhere to any relevant project-specific style guides and conventions.

## 1. UI Modification Prohibition

- **Do NOT change, update, or modify the user interface (UI) in any way unless the user explicitly instructs you to do so.**
- UI includes layouts, themes, colors, menus, buttons, panels, dialogs, icons, navigation, and any other visual or interactive elements.
- Do not add, remove, or rearrange UI components unless directly requested.
- If a task could inadvertently affect the UI, warn the user and request clarification before proceeding.

## 2. Functionality Integrity

- **Do NOT break, disable, or remove any existing functionality** in the project.
- All changes must preserve current features, workflows, integrations, and user interactions unless the user specifically instructs you to update or improve a functionality.
- Avoid refactoring, renaming, or deleting code that could impact existing features unless explicitly directed.
- If a requested change risks breaking functionality, notify the user and ask for confirmation before proceeding.

## 3. Explicit User Instructions Required

- Only make changes to the UI or functionality in response to clear, explicit instructions from the user.
- If the user's instruction is **ambiguous** or could result in UI or functional changes, always ask for clarification before acting.
- Never assume permission to update the UI or alter functionality.

## 4. Testing and Validation

- After implementing any requested changes, **validate that the UI remains unchanged** (unless instructed) and that all existing functionalities work as expected.
- Run all relevant tests and perform manual checks as needed.
- Report any potential impacts, risks, or unintended side effects to the user before finalizing changes.

## 5. Documentation

- Document all changes made, including the reason for the change and confirmation that UI and functionality were preserved according to these instructions.
- Update relevant documentation files (e.g., CHANGELOG, README) as appropriate.

**Summary:**  
Copilot Agent must always protect the UI and existing functionality. Only make changes when explicitly requested by the user. When in doubt, request clarification and never assume permission to update UI or break functionality.
