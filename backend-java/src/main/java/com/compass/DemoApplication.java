package com.compass;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
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

    private Map<String, Double> accounts = new HashMap<>();

    public BankController() {
        accounts.put("balance", 1000.0);
    }

    @GetMapping("/balance")
    public Map<String, Object> getBalance() {
        Map<String, Object> response = new HashMap<>();
        response.put("balance", accounts.get("balance"));
        response.put("status", "success");
        return response;
    }

    @PostMapping("/deposit")
    public Map<String, Object> deposit(@RequestBody Map<String, Double> request) {
        Double amount = request.get("amount");
        if (amount == null || amount <= 0) {
            return errorResponse("Invalid amount");
        }

        Double currentBalance = accounts.get("balance");
        accounts.put("balance", currentBalance + amount);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("balance", accounts.get("balance"));
        response.put("message", "Deposited " + amount);
        return response;
    }

    @PostMapping("/withdraw")
    public Map<String, Object> withdraw(@RequestBody Map<String, Double> request) {
        Double amount = request.get("amount");
        if (amount == null || amount <= 0) {
            return errorResponse("Invalid amount");
        }

        Double currentBalance = accounts.get("balance");
        if (amount > currentBalance) {
            return errorResponse("Insufficient funds");
        }

        accounts.put("balance", currentBalance - amount);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("balance", accounts.get("balance"));
        response.put("message", "Withdrawn " + amount);
        return response;
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