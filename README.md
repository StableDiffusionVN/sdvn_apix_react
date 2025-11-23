# 🌈 aPix by SDVN

**aPix** là một ứng dụng web hiện đại, mạnh mẽ dành cho việc sáng tạo và chỉnh sửa hình ảnh, được tích hợp sâu với các công nghệ AI tiên tiến. Dự án được xây dựng với React, Vite, TailwindCSS và Express.js.

![aPix Banner](logo_site.png)

## ✨ Tính năng nổi bật

*   **Layer Composer:** Trình soạn thảo layer chuyên nghiệp, hỗ trợ kéo thả, thay đổi kích thước, xoay, và sắp xếp layer.
*   **AI Generation:** Tích hợp Google Gemini AI để tạo hình ảnh từ văn bản (Text-to-Image) với nhiều preset phong phú.
*   **Image Editor:** Bộ công cụ chỉnh sửa ảnh đầy đủ: cắt, xoay, chỉnh màu (độ sáng, tương phản, bão hòa...), bộ lọc màu.
*   **Gallery & History:** Quản lý thư viện ảnh và lịch sử tạo ảnh thông minh, hỗ trợ kéo thả upload.
*   **Template System:** Hệ thống template đa dạng cho nhiều mục đích: Ảnh bìa, Avatar, Ảnh em bé, Thời trang, v.v.
*   **Infinite Canvas:** Chế độ bảng vẽ vô cực cho sự sáng tạo không giới hạn.

## 🛠️ Công nghệ sử dụng

*   **Frontend:** React 19, Vite, TailwindCSS, Framer Motion.
*   **Backend:** Node.js, Express, Multer (xử lý file upload).
*   **AI:** Google Gemini API.

## 🚀 Cài đặt và Khởi chạy

Yêu cầu: Máy tính đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).

### Cách 1: Chạy tự động (Khuyên dùng)

Chúng tôi đã chuẩn bị sẵn các script để tự động cài đặt và chạy ứng dụng chỉ với 1 cú click chuột:

*   **MacOS:** Chạy file `install_and_run.command`
*   **Windows:** Chạy file `install_and_run.bat`
*   **Linux:** Chạy file `install_and_run.sh`

*(Lần đầu chạy sẽ mất một chút thời gian để tải các thư viện cần thiết).*

### Cách 2: Chạy thủ công bằng dòng lệnh

1.  **Cài đặt thư viện:**
    ```bash
    # Tại thư mục gốc
    npm install

    # Tại thư mục server
    cd server
    npm install
    cd ..
    ```

2.  **Khởi chạy ứng dụng:**
    ```bash
    npm run dev:all
    ```
    Lệnh này sẽ chạy song song cả Frontend (http://localhost:5173) và Backend (http://localhost:3001).

## 📂 Cấu trúc dự án

```
sdvn_apix_react/
├── components/         # Các thành phần giao diện (UI Components)
│   ├── LayerComposer/  # Module xử lý Layer và Canvas
│   ├── ImageEditor/    # Module chỉnh sửa ảnh
│   └── ...
├── server/             # Backend server (Node.js/Express)
│   ├── gallery/        # Thư mục chứa ảnh người dùng upload
│   ├── history/        # Thư mục chứa lịch sử tạo ảnh
│   └── index.js        # File khởi chạy server
├── dist/               # (Tự động tạo) Mã nguồn đã đóng gói cho production
├── public/             # Tài nguyên tĩnh
└── ...
```

## 📝 Lưu ý

*   **Cổng (Port):** Mặc định Frontend chạy ở port `5173` và Backend ở port `3001`. Nếu các cổng này bị chiếm dụng, bạn có thể cần tắt ứng dụng đang chạy hoặc đổi cổng trong cấu hình.
*   **Dữ liệu:** Ảnh và dữ liệu được lưu trong thư mục `server/gallery`, `server/history`, và `server/data`. Hãy sao lưu các thư mục này nếu cần.

---
Developed with ❤️ by SDVN Team.
