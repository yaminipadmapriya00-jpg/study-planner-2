
package Favourites;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository repository;

    public TaskController(TaskRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return repository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task createTask(@RequestBody Task task) {
        validateTask(task);
        task.setCompleted(false);
        return repository.save(task);
    }

    @PutMapping("/{id}")
    public Task updateTask(
            @PathVariable Long id,
            @RequestBody Task updatedTask) {

        Task task = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Task not found"));

        validateTask(updatedTask);

        task.setTitle(updatedTask.getTitle().trim());
        task.setSubject(updatedTask.getSubject());
        task.setDueDate(updatedTask.getDueDate());
        task.setCompleted(updatedTask.isCompleted());

        return repository.save(task);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Task not found");
        }

        repository.deleteById(id);
    }

    private void validateTask(Task task) {
        if (task.getTitle() == null ||
                task.getTitle().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Task title is required");
        }

        if (task.getTitle().length() > 150) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Title is too long");
        }

        List<String> subjects = List.of(
                "DBMS", "DS", "JAVA-OOPS", "DMS",
                "AI", "DW", "DLD"
        );

        if (!subjects.contains(task.getSubject())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid subject");
        }

        task.setTitle(task.getTitle().trim());
    }
}
