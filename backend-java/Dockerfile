FROM maven:3.8-openjdk-17 AS build
WORKDIR /app
COPY backend-java/pom.xml .
RUN mvn dependency:go-offline
COPY backend-java/src ./src
COPY backend-java/src/main/resources ./src/main/resources
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]