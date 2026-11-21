import os
import sys
import zipfile
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

# 1. Create a zip archive of dist and updated server files
zip_path = "d:/ARY Services/deploy_latest.zip"
print("Creating deployment zip...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add dist files
    dist_dir = "d:/ARY Services/dist"
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, "d:/ARY Services")
            zipf.write(full_path, rel_path)
    
    # Add updated server files
    server_dir = "d:/ARY Services/server/src"
    for root, dirs, files in os.walk(server_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, "d:/ARY Services")
            zipf.write(full_path, rel_path)

    # Add all cleaned data files from server/data
    data_dir = "d:/ARY Services/server/data"
    for file in os.listdir(data_dir):
        if file.endswith('.json'):
            full_path = os.path.join(data_dir, file)
            zipf.write(full_path, f"server/data/{file}")

print(f"Zip created: {os.path.getsize(zip_path)} bytes")

# 2. Upload via SFTP to VPS
vps_host = os.environ.get('VPS_HOST', '173.212.223.108')
vps_user = os.environ.get('VPS_USER', 'root')
vps_pass = os.environ.get('VPS_PASSWORD')
if not vps_pass and len(sys.argv) > 1:
    vps_pass = sys.argv[1]

if not vps_pass:
    print("Error: VPS_PASSWORD environment variable or password argument required.")
    sys.exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Connecting to {vps_host} as {vps_user}...")
ssh.connect(vps_host, username=vps_user, password=vps_pass, timeout=15)
sftp = ssh.open_sftp()

print("Uploading deploy_latest.zip to /var/www/ary-services/...")
sftp.put(zip_path, '/var/www/ary-services/deploy_latest.zip')
sftp.close()

# 3. Extract and restart PM2
print("Extracting and updating on server...")
cmds = [
    "cd /var/www/ary-services && unzip -o deploy_latest.zip",
    "cd /var/www/ary-services && rm -f deploy_latest.zip",
    "pm2 restart ary-backend",
    "systemctl reload nginx"
]
for cmd in cmds:
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip():
        print("OUT:", out.strip())
    if err.strip():
        print("ERR:", err.strip())

# Clean up local zip
if os.path.exists(zip_path):
    os.remove(zip_path)

ssh.close()
print("🎉 Deployment to VPS complete!")
