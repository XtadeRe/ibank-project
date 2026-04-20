# TODO: Laravel/React Performance Optimization Plan
Status: In Progress

## Steps from Approved Plan:
- [x] 1. Replace git clone in DockerAgentService.php → static branches + longer cache (24h)
- [x] 2. Update DashboardController.php → cache 60s, Sandbox limit(50)
- [x] 3. Optimize React ContainerList.js → poll 60s, timeout 45s
- [ ] 4. Config queue/cache → redis (requires .env/setup)
- [x] 6. Fixed UptimeChart.js → no-cache header + poll 2min for faster manual updates
- [ ] 5. Add HealthCheck purge scope + cron (optional)
- [x] 7. Core optimizations complete
- [ ] 7. Update TODO as complete
