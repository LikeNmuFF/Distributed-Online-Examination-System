# Docker Installation & Setup Guide

## ⚠️ Current Status

Your system doesn't have Docker installed yet. Here's how to install it:

## 🐳 Installation Options

### Option 1: Ubuntu/Debian (Recommended)

```bash
# 1. Update package list
sudo apt-get update

# 2. Install Docker
sudo apt-get install -y docker.io docker-compose

# 3. Add your user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# 4. Activate group changes
newgrp docker

# 5. Verify installation
docker --version
docker compose version
```

### Option 2: Using Docker's Official Repository (Latest Version)

```bash
# 1. Remove old versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# 2. Install dependencies
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 3. Add Docker's GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 4. Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 6. Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# 7. Verify installation
docker --version
docker compose version
```

### Option 3: Windows (WSL2)

If you're using Windows Subsystem for Linux 2 (WSL2):

```bash
# Install Docker Desktop for Windows from:
# https://www.docker.com/products/docker-desktop

# Then in WSL2 terminal:
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker
```

## ✅ Verify Installation

After installing, run these commands:

```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10.x or higher

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.x.x or higher

# Test Docker is working
docker run hello-world
# Expected: "Hello from Docker!"

# Test Docker daemon is running
docker ps
# Expected: Empty list of containers (or error if daemon not running)
```

## 🚀 Now Run the Exam System

Once Docker is installed, navigate to the project and run:

```bash
# Navigate to project directory
cd "Distributed Online Examination System can be designed and implemented using Parallel and Distributed Computing"

# Build and start all services
docker compose up --build

# Wait for "healthy" status on all containers (~30 seconds)
# Then access: http://localhost
```

## 🔧 Troubleshooting

### "Permission denied while trying to connect to Docker daemon"

**Solution**: Add your user to docker group (already in commands above)

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Then try again:
```bash
docker ps
```

### "Cannot connect to Docker daemon"

Docker daemon isn't running.

**Solution**:
```bash
# Start Docker daemon
sudo systemctl start docker

# Enable auto-start on boot
sudo systemctl enable docker

# Verify it's running
sudo systemctl status docker
```

### "docker compose: command not found"

You have old docker-compose installed, but not the new docker compose CLI.

**Solution**:
```bash
# Install docker-compose-plugin
sudo apt-get install -y docker-compose-plugin

# Or upgrade
sudo apt-get update
sudo apt-get upgrade -y docker.io
```

### Port Already in Use (80, 5173, 3001-3003, 5432, 6379)

Some service is already using the ports.

**Solution**:
```bash
# Find what's using port 80
sudo lsof -i :80

# Kill it if safe
sudo kill -9 <PID>

# Or modify docker-compose.yml to use different ports
# Example: Change port 80 to 8080:
# ports:
#   - "8080:80"
```

Then access at: http://localhost:8080

### "Cannot find module" / Build fails

Docker image build failed.

**Solution**:
```bash
# Clean and rebuild
docker compose down
docker compose down -v  # Also remove volumes
docker system prune      # Clean up unused resources
docker compose up --build
```

## 📋 Pre-flight Checklist

Before running the system, ensure:

- [ ] Docker installed: `docker --version` works
- [ ] Docker Compose available: `docker compose version` works
- [ ] Docker daemon running: `docker ps` returns empty list
- [ ] User in docker group: `docker run hello-world` works without sudo
- [ ] Ports available: 80, 5173, 3001-3003, 5432, 6379
- [ ] Disk space: At least 5GB free (for Docker images)
- [ ] Memory: At least 4GB available

## 🎯 Next Steps

Once Docker is ready:

```bash
# 1. Navigate to project
cd "Distributed Online Examination System can be designed and implemented using Parallel and Distributed Computing"

# 2. Start system
docker compose up --build

# 3. Wait for "healthy" status
# You should see:
# - redis is healthy ✓
# - postgres is healthy ✓
# - exam-node-1 is healthy ✓
# - exam-node-2 is healthy ✓
# - exam-node-3 is healthy ✓

# 4. Open browser
# http://localhost

# 5. Login
# Username: student1
# Password: test123

# 6. Take exam!
```

## 📞 Need Help?

If you encounter issues:

1. Check Docker is running: `docker ps`
2. Check logs: `docker compose logs -f`
3. Check specific service: `docker compose logs -f exam-node-1`
4. Verify network: `docker network ls`
5. Verify volumes: `docker volume ls`

## 💡 Pro Tips

### Run in Background

```bash
docker compose up -d
```

Then check status:
```bash
docker compose ps
docker compose logs -f
```

### Stop Everything

```bash
docker compose down
```

### Clean Slate

```bash
docker compose down -v  # Also removes database volumes
docker system prune     # Clean up unused resources
docker compose up --build
```

### Monitor Performance

```bash
docker stats
```

---

**Once Docker is installed, you're ready to run the entire system! 🚀**
