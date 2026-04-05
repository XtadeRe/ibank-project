package com.compass;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;
import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.*;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

// Entity для операций
@Entity
@Table(name = "transactions")
class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String type;
    private Double amount;
    private LocalDateTime timestamp;

    public Transaction() {}

    public Transaction(String type, Double amount) {
        this.type = type;
        this.amount = amount;
        this.timestamp = LocalDateTime.now();
    }

    // Геттеры
    public Long getId() { return id; }
    public String getType() { return type; }
    public Double getAmount() { return amount; }
    public LocalDateTime getTimestamp() { return timestamp; }

    // Сеттеры (нужны для JPA)
    public void setId(Long id) { this.id = id; }
    public void setType(String type) { this.type = type; }
    public void setAmount(Double amount) { this.amount = amount; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}

// Repository
interface TransactionRepository extends JpaRepository<Transaction, Long> {}

// REST Controller
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
class BankController {

    @Autowired
    private TransactionRepository transactionRepository;

    private Double balance = 1000.00;

    @GetMapping("/balance")
    public Map<String, Object> getBalance() {
        Map<String, Object> response = new HashMap<>();
        response.put("balance", balance);
        response.put("status", "success");
        return response;
    }

    @PostMapping("/deposit")
    public Map<String, Object> deposit(@RequestBody Map<String, Double> request) {
        Double amount = request.get("amount");
        if (amount == null || amount <= 0) {
            return errorResponse("Invalid amount");
        }

        balance += amount;
        Transaction transaction = new Transaction("DEPOSIT", amount);
        transactionRepository.save(transaction);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("balance", balance);
        response.put("message", "Deposited " + amount);
        return response;
    }

    @PostMapping("/withdraw")
    public Map<String, Object> withdraw(@RequestBody Map<String, Double> request) {
        Double amount = request.get("amount");
        if (amount == null || amount <= 0) {
            return errorResponse("Invalid amount");
        }
        if (amount > balance) {
            return errorResponse("Insufficient funds");
        }

        balance -= amount;
        Transaction transaction = new Transaction("WITHDRAW", amount);
        transactionRepository.save(transaction);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("balance", balance);
        response.put("message", "Withdrawn " + amount);
        return response;
    }

    @GetMapping("/transactions")
    public List<Transaction> getTransactions() {
        return transactionRepository.findAll();
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("service", "Compass Plus Demo Bank");
        return response;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}