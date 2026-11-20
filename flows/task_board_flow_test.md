---
mode: testing
url: http://localhost:3000
headless: true
max_steps: 25
tags: [regression, task-board, flowpatch]
---

# FlowPatch Task Board Primary User Journey

## Verify Task Board Workspace Loads
Navigate to http://localhost:3000 and verify the Sprint Task Board workspace is visible with the New Task title input and the "Add Task" button.

## Create a New Task Item
Type "Verify Kane flow regression check" into the New Task title input and click the "Add Task" button.
Verify that "Verify Kane flow regression check" appears in the task board list with status "Active".

## Complete the Created Task
Click the "Mark complete" toggle for task "Verify Kane flow regression check".
Verify that "Verify Kane flow regression check" shows status "Completed".

## Delete the Completed Task
Click the "Delete task" button for "Verify Kane flow regression check".
Verify that "Verify Kane flow regression check" is removed from the task board list.
