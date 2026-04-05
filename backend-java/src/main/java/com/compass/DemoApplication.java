package com.compass;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;
import javax.persistence.*;
import java.util.*;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }
}

// Модель транзакции (таблица в БД)
@Entity
@Table(name = "transactions")
class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String type;
    private Double amount;
    private Date timestamp;

    public Transaction() {}

    public Transaction(String type, Double amount) {
        this.type = type;
        this.amount = amount;
        this.timestamp = new Date();
    }

    // Геттеры
    public Long getId() { return id; }
    public String getType() { return type; }
    public Double getAmount() { return amount; }
    public Date getTimestamp() { return timestamp; }
}

// Репозиторий для работы с БД
interface TransactionRepository extends JpaRepository<Transaction, Long> {}

// Контроллер
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
class BankController {

    @Autowired
    private TransactionRepository transactionRepository;

    private double balance = 1000.0;

    @GetMapping("/balance")
    public Map<String, Object> getBalance() {
        Map<String, Object> response = new HashMap<>();
        response.put("balance", balance);
        return response;
    }

    @GetMapping("/transactions")
    public List<Transaction> getTransactions() {
        return transactionRepository.findAll();
    }

    @PostMapping("/deposit")
    public Map<String, Object> deposit(@RequestBody Map<String, Double> request) {
        Double amount = request.get("amount");
        if (amount == null || amount <= 0) {
            return errorResponse("Invalid amount");
        }

        balance += amount;
        transactionRepository.save(new Transaction("DEPOSIT", amount));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("balance", balance);
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
        transactionRepository.save(new Transaction("WITHDRAW", amount));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("balance", balance);
        return response;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        return response;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}