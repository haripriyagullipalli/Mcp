# Build the Docker image
# (Run this from the project root)
docker build -t mcp-server .

# Run the Docker container
# (Change the port if your app uses a different one)
docker run -p 8080:8080 --env-file .env mcp-server

# Stop and remove the container (replace <container_id> with actual ID)
docker stop <container_id>
docker rm <container_id>

# View running containers
docker ps

# View container logs
docker logs <container_id>
