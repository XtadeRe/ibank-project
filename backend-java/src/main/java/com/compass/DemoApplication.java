package com.compass;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
                        .allowedMethods("*")
                        .allowedHeaders("*");
            }
        };
    }
}

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
    public Long getId() { return id; }
    public String getType() { return type; }
    public Double getAmount() { return amount; }
    public Date getTimestamp() { return timestamp; }
}

interface TransactionRepository extends JpaRepository<Transaction, Long> {}

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
class BankController {

    @Value("${APP_PORT:8080}")
    private String appPort;

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
            return errorResponse("Неправильная сумма");
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
            return errorResponse("Неправильная сумма");
        }
        if (amount > balance) {
            return errorResponse("Не хватает средств");
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

    @GetMapping("/balance/info")
    public Map<String, Object> getApiInfo() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        Map<String, String> urls = new HashMap<>();
        urls.put("app", "http://localhost:" + appPort); 
        response.put("urls", urls);
        return response;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}