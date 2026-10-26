
const API = "/api/tasks";

const subjects = [
    "DBMS", "DS", "JAVA-OOPS", "DMS", "AI", "DW", "DLD"
];

const colors = [
    "#6c67ed", "#3b9fe8", "#e75c94", "#e9a33b",
    "#20aa8c", "#9874e9", "#42a9d8"
];

const $ = (id) => document.getElementById(id);

let tasks = [];
let timerSeconds = 25 * 60;
let timerInterval = null;

$("todayDate").textContent = new Date().toLocaleDateString(
    "en-IN", { day: "numeric", month: "short", year: "numeric" }
);

$("taskDate").min = new Date().toLocaleDateString("en-CA");

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
}

async function loadTasks() {
    try {
        tasks = await request(API);
        render();
    } catch (error) {
        $("taskList").innerHTML =
            '<p class="empty">Could not load tasks. Check that Spring Boot and MySQL are running.</p>';
        showMessage(error.message, true);
    }
}

function showMessage(message, isError = false) {
    $("formMessage").textContent = message;
    $("formMessage").style.color = isError ? "#d34d64" : "#188b6a";
}

$("taskForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = $("taskTitle").value.trim();
    const subject = $("taskSubject").value;
    const dueDate = $("taskDate").value || null;

    if (!title || !subjects.includes(subject)) {
        showMessage("Enter a task name and choose a subject.", true);
        return;
    }

    try {
        await request(API, {
            method: "POST",
            body: JSON.stringify({ title, subject, dueDate })
        });

        $("taskForm").reset();
        $("taskDate").min = new Date().toLocaleDateString("en-CA");
        showMessage("Task saved successfully!");
        await loadTasks();
    } catch (error) {
        showMessage("Could not save task. " + error.message, true);
    }
});

async function toggleTask(task) {
    try {
        await request(`${API}/${task.id}`, {
            method: "PUT",
            body: JSON.stringify({
                title: task.title,
                subject: task.subject,
                dueDate: task.dueDate,
                completed: !task.completed
            })
        });
        await loadTasks();
    } catch (error) {
        showMessage("Could not update task. " + error.message, true);
    }
}

async function deleteTask(id) {
    if (!confirm("Delete this study task?")) return;

    try {
        await request(`${API}/${id}`, { method: "DELETE" });
        showMessage("Task deleted.");
        await loadTasks();
    } catch (error) {
        showMessage("Could not delete task. " + error.message, true);
    }
}

function render() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const remaining = total - completed;
    const percent = total ? Math.round(completed / total * 100) : 0;

    $("totalCount").textContent = total;
    $("completedCount").textContent = completed;
    $("remainingCount").textContent = remaining;
    $("overallPercent").textContent = percent + "%";
    $("overallBar").style.width = percent + "%";
    $("taskSummary").textContent = `${completed} of ${total} completed`;

    const sorted = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.dueDate || "9999-12-31").localeCompare(
            b.dueDate || "9999-12-31"
        );
    });

    if (sorted.length === 0) {
        $("taskList").innerHTML =
            '<p class="empty">No tasks yet. Add your first study task above! ✨</p>';
    } else {
        $("taskList").replaceChildren();

        sorted.forEach(task => {
            const row = document.createElement("div");
            row.className = "task-row" + (task.completed ? " done" : "");

            const check = document.createElement("input");
            check.type = "checkbox";
            check.className = "task-check";
            check.checked = task.completed;
            check.setAttribute("aria-label", `Complete ${task.title}`);
            check.addEventListener("change", () => toggleTask(task));

            const title = document.createElement("span");
            title.className = "task-title";
            title.textContent = task.title;

            const tag = document.createElement("span");
            tag.className = "subject-tag";
            tag.textContent = task.subject;

            const date = document.createElement("span");
            date.className = "due-date";
            date.textContent = task.dueDate
                ? new Date(task.dueDate + "T00:00:00").toLocaleDateString(
                    "en-IN", { day: "numeric", month: "short", year: "numeric" }
                )
                : "No deadline";

            const del = document.createElement("button");
            del.className = "delete-btn";
            del.textContent = "✕";
            del.title = "Delete task";
            del.setAttribute("aria-label", `Delete ${task.title}`);
            del.addEventListener("click", () => deleteTask(task.id));

            row.append(check, title, tag, date, del);
            $("taskList").append(row);
        });
    }

    $("subjectProgress").replaceChildren();

    subjects.forEach((subject, index) => {
        const subjectTasks = tasks.filter(task => task.subject === subject);
        const done = subjectTasks.filter(task => task.completed).length;
        const count = subjectTasks.length;
        const progress = count ? Math.round(done / count * 100) : 0;

        const card = document.createElement("article");
        card.className = "subject-card";

        const heading = document.createElement("h3");
        heading.textContent = subject;

        const percentText = document.createElement("div");
        percentText.className = "subject-percent";
        percentText.textContent = progress + "%";

        const track = document.createElement("div");
        track.className = "progress-track";

        const fill = document.createElement("div");
        fill.className = "progress-fill";
        fill.style.width = progress + "%";
        fill.style.setProperty("--subject-color", colors[index]);
        track.append(fill);

        const countText = document.createElement("p");
        countText.textContent = `${done} / ${count} tasks completed`;

        card.append(heading, percentText, track, countText);
        $("subjectProgress").append(card);
    });
}

// Pomodoro timer
function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    $("timerDisplay").textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

$("startTimer").addEventListener("click", () => {
    if (timerInterval) return;

    $("timerLabel").textContent = "Focus time";

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            $("timerLabel").textContent = "Session complete!";
            $("timerMessage").textContent = "Great work! Take a short break.";
            alert("Focus session complete! Take a short break.");
        }
    }, 1000);

    $("startTimer").textContent = "⏸ Timer running";
});

$("resetTimer").addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 25 * 60;
    updateTimerDisplay();
    $("timerLabel").textContent = "Ready to focus";
    $("timerMessage").textContent = "";
    $("startTimer").textContent = "▶ Start focus";
});

loadTasks();
const API_URL = 'http://localhost:8081/api/tasks';

// 1. Function to fetch and display all tasks
async function loadTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        
        console.log("Fetched tasks:", tasks);
        // If you have a container in your HTML with id="task-list", you can display them:
        // const taskList = document.getElementById('task-list');
        // taskList.innerHTML = tasks.map(t => `<div>${t.title} - ${t.subject}</div>`).join('');
    } catch (error) {
        console.error("Error loading tasks:", error);
    }
}

// 2. Function to add a new task (example)
async function addNewTask(title, subject, dueDate) {
    const newTask = {
        title: title,
        subject: subject,
        dueDate: dueDate
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            console.log("Task added successfully!");
            loadTasks(); // Reload the list
        } else {
            console.error("Failed to add task");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Automatically load tasks when the page opens
loadTasks();