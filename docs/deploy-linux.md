# 部署到已有的 Linux 云虚拟机

本项目是静态网站，Nginx 只负责发送 HTML、JavaScript、图片和 GLB 文件。3D 渲染在访客浏览器中完成，无需服务器端 GPU、数据库或 Node.js 常驻进程。原有新闻、邮件等功能仍调用各自的外部服务。

## 1. 在本机生成并上传部署包

在项目根目录执行以下命令；生成的 ZIP 内直接包含 `index.html`、`assets/` 和各页面目录：

```powershell
python tools/package-site.py
scp .cache/deploy/playchessclub-website.zip deploy/nginx-site.conf USER@SERVER_IP:/tmp/
```

把 `USER` 换成有 sudo 权限的 SSH 用户，把 `SERVER_IP` 换成虚拟机公网 IP。也可以通过 SFTP 客户端把这两个文件上传到 `/tmp/`。部署包排除了 `.git`、测试工具和本地缓存，完整保留了模型、纹理、引擎及旧页面兼容跳转。

## 2. 安装 Nginx，解压网站

SSH 登录虚拟机后，先用 `cat /etc/os-release` 确认系统。Ubuntu / Debian：

```bash
sudo apt update
sudo apt install nginx unzip
```

CentOS Stream / Rocky Linux / AlmaLinux：

```bash
sudo dnf install nginx unzip
```

首次部署到独立站点目录：

```bash
sudo install -d -m 755 /var/www/playchessclub
sudo unzip /tmp/playchessclub-website.zip -d /var/www/playchessclub
sudo find /var/www/playchessclub -type d -exec chmod 755 {} +
sudo find /var/www/playchessclub -type f -exec chmod 644 {} +
```

解压后应直接存在 `/var/www/playchessclub/index.html`，不要多套一层项目文件夹。启用 SELinux 的系统再执行 `sudo restorecon -RF /var/www/playchessclub`，让 Nginx 能读取网站文件。

## 3. 配置站点和域名

将域名的 A 记录指向虚拟机公网 IPv4 地址。在云控制台安全组开放入站 TCP 80、443；如果系统防火墙启用，也需要放行这两个端口。随后安装模板：

```bash
sudo cp /tmp/nginx-site.conf /etc/nginx/conf.d/playchessclub.conf
sudo nano /etc/nginx/conf.d/playchessclub.conf
```

把 `server_name example.com;` 换成你的实际域名，例如 `server_name www.example.com example.com;`。如需先用公网 IP 预览，可以把公网 IP 也加到这一行。若 Nginx 已有使用同一域名的站点，应更新那个站点的配置，不要重复定义。

检查并启用配置：

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

只有 `nginx -t` 成功后才执行后两条命令。UFW 已启用时可用 `sudo ufw allow 80/tcp` 和 `sudo ufw allow 443/tcp`；firewalld 已启用时可用 `sudo firewall-cmd --permanent --add-service=http --add-service=https`，然后执行 `sudo firewall-cmd --reload`。

模板已设置 `index.html` 默认首页、子目录页面寻址、JavaScript MIME 类型、GLB 下载类型、压缩和缓存重新验证。本网站采用多个目录页面，不需要把所有请求重写到首页。

## 4. 启用 HTTPS 并验证

域名解析生效、HTTP 访问正常后，使用云厂商证书或 Certbot 配置 HTTPS。Certbot 的安装方式按对应 Linux 版本选择；安装其 Nginx 插件后可执行 `sudo certbot --nginx -d 你的域名`，并按提示启用 HTTPS 跳转。完整步骤参见 [Certbot 官方说明](https://certbot.eff.org/instructions)。

检查首页的四幕滚动、深浅色切换，以及 `/gallery/`、`/mail/` 等子页面。在浏览器网络面板确认 `assets/models/home/pcc-riverside.glb` 和 `assets/vendor/three/build/three.module.min.js` 正常返回；脚本不能返回 HTML 错误页。新闻、邮件和 AI 服务需各自的远端接口可访问。

如果服务器位于中国内地，域名需要按云厂商要求完成备案或接入手续。参见 [阿里云建站流程](https://help.aliyun.com/zh/ecs/user-guide/build-a-website/)。

## 后续更新

重新执行打包命令并上传新 ZIP。先保留服务器上的上一版站点副本，再把新包解压到站点目录；纯静态文件更新无需重启 Node.js 或 Python 服务。若修改 Nginx 配置，仍应先执行 `nginx -t` 再重载。

参考：[Ubuntu 安装 Nginx](https://ubuntu.com/server/docs/how-to/web-services/install-nginx/)、[Nginx 静态文件指南](https://nginx.org/en/docs/beginners_guide.html)、[Nginx try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)。
