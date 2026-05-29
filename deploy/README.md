# 部署 reader.youbeat.cn

这个项目按独立子站部署，避免影响现有 `www.youbeat.cn`：

- 站点域名：`reader.youbeat.cn`
- 应用目录：`/opt/margin-note-reader`
- 本机端口：`127.0.0.1:3001`
- PM2 进程名：`margin-note-reader`
- nginx 配置：`/etc/nginx/conf.d/reader.youbeat.cn.conf`

## 1. 域名解析

在 DNS 控制台添加 A 记录：

```text
reader.youbeat.cn -> 62.234.5.39
```

等待解析生效后，在本地或服务器执行：

```bash
dig +short reader.youbeat.cn
```

应该返回：

```text
62.234.5.39
```

## 2. 拉取代码

```bash
sudo mkdir -p /opt/margin-note-reader
sudo chown -R "$USER:$USER" /opt/margin-note-reader
git clone https://github.com/Leo9866/margin-note-reader.git /opt/margin-note-reader
cd /opt/margin-note-reader
```

如果目录已经存在：

```bash
cd /opt/margin-note-reader
git fetch --all --prune
git pull --ff-only
```

## 3. 配置模型环境变量

在服务器项目目录创建 `.env.local`，不要提交到 Git：

```bash
cat > .env.local <<'EOF'
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://lucen.cc
OPENAI_MODEL=gpt-5.4
OPENAI_REASONING_EFFORT=xhigh
EOF
chmod 600 .env.local
```

## 4. 安装、构建、启动

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 status margin-note-reader
```

## 5. 配置 nginx

```bash
sudo cp deploy/nginx-reader.youbeat.cn.conf /etc/nginx/conf.d/reader.youbeat.cn.conf
sudo nginx -t
sudo systemctl reload nginx
```

此时 HTTP 应该可以访问：

```text
http://reader.youbeat.cn
```

## 6. 配置 HTTPS

如果服务器已经安装 certbot：

```bash
sudo certbot --nginx -d reader.youbeat.cn
sudo nginx -t
sudo systemctl reload nginx
```

如果没有 certbot，需要先按服务器现有证书方案安装或接入证书，再为 `reader.youbeat.cn` 增加 HTTPS server block。

## 7. 日常更新

```bash
cd /opt/margin-note-reader
git pull --ff-only
npm ci
npm run build
pm2 restart margin-note-reader --update-env
pm2 save
```
