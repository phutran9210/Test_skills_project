# 🚀 SmartCos Backend Coding Test

## 🎯 Mục tiêu
Xây dựng REST API quản lý sản phẩm:
- CRUD sản phẩm
- Redis cache cho GET
- JWT Auth cho tất cả endpoint
- Unit test với Jest

---

## ⚙️ Yêu cầu kỹ thuật
- Node.js (Express hoặc NestJS)
- PostgreSQL
- Redis
- Docker Compose

---

## 📦 Cách chạy ứng dụng

### ✅ 1. Clone repo
```bash
git clone <YOUR_REPO_URL>
cd smartcos-backend-test
```

### ✅ 2. Copy file .env.example thành .env
```bash
cp .env.example .env
```

### ✅ 3. Chạy bằng Docker Compose (App + PostgreSQL + Redis)
```bash
docker-compose up --build
```

- API sẽ chạy ở: **http://localhost:3000**

---

## ✅ Các yêu cầu trong bài test
- [ ] Hoàn thiện CRUD sản phẩm (GET với pagination + filter, PUT, DELETE)
- [ ] Redis cache cho API GET (expire 60s)
- [ ] JWT Auth bảo vệ tất cả route
- [ ] Viết Unit test cho ít nhất 2 endpoint (Jest)

---

## 🧪 Chạy test
```bash
npm install
npm run test
```

---

## 📤 Cách nộp bài
- Fork repo này
- Hoàn thiện bài test trong thư mục `src/`
- Tạo Pull Request về nhánh **main**

✅ CI sẽ tự động chạy và kiểm tra bài của bạn.

---

## 🔗 Công nghệ đã setup sẵn
- Express + TypeORM (PostgreSQL)
- Redis client
- JWT middleware
- Jest config
- Docker Compose (App + PostgreSQL + Redis)
- GitHub Actions CI
