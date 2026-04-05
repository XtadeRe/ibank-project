package com.compass;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import javax.sql.DataSource;
import java.sql.Connection;
import java.util.*;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

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

        Transaction transaction = new Transaction();
        transaction.setType("DEPOSIT");
        transaction.setAmount(amount);
        transaction.setTimestamp(new Date());
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

        Transaction transaction = new Transaction();
        transaction.setType("WITHDRAW");
        transaction.setAmount(amount);
        transaction.setTimestamp(new Date());
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

// DatabaseChecker Component
@Component
class DatabaseChecker {

    @Autowired
    private DataSource dataSource;

    @EventListener(ApplicationReadyEvent.class)
    public void checkDatabase() {
        try (Connection conn = dataSource.getConnection()) {
            System.out.println("✅ Database connected successfully!");
            System.out.println("   URL: " + conn.getMetaData().getURL());
        } catch (Exception e) {
            System.err.println("❌ Database connection failed: " + e.getMessage());
        }
    }
}