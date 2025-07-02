/**
 * editor.js - Logic cho trang Editor
 *
 * Chức năng:
 * 1. Xử lý việc đặt URL ảnh bìa.
 * 2. Cung cấp trình soạn thảo Markdown với xem trước trực tiếp.
 * 3. Cho phép chèn ảnh vào nội dung qua URL.
 * 4. Tạo và cho phép tải xuống file .md VÀ file posts.json đã được cập nhật.
 * 5. Tải và hiển thị bài viết gần đây nhất.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const editorForm = document.getElementById('editorForm');
    const coverImageWrapper = document.getElementById('coverImageWrapper');
    const uploadCoverBtn = document.getElementById('cover-upload-btn');
    const markdownContentInput = document.getElementById('markdownContent');
    const htmlPreview = document.getElementById('htmlPreview');
    const uploadImgBtn = document.getElementById('uploadImgBtn');
    const recentPostContainer = document.getElementById('recentPostContainer');
    const loadingRecentPost = document.getElementById('loadingRecentPost');

    // Biến toàn cục để lưu trữ URL ảnh bìa
    let coverImageUrl = '';

    // --- EDITOR LOGIC ---

    // 1. Logic cho nút Upload Ảnh bìa
    uploadCoverBtn.addEventListener('click', () => {
        const imageUrl = prompt("Please enter the cover image URL:");
        if (imageUrl && imageUrl.trim() !== '') {
            coverImageUrl = imageUrl.trim();
            coverImageWrapper.style.backgroundImage = `url(${coverImageUrl})`;
            coverImageWrapper.classList.add('has-image');
        }
    });

    // 2. Logic cho nút "Upload IMG" vào nội dung
    uploadImgBtn.addEventListener('click', () => {
        const imageUrl = prompt("Please enter the image URL to insert:");
        if (imageUrl && imageUrl.trim() !== '') {
            const markdownImg = `\n![Image alt text](${imageUrl.trim()})\n`;
            insertTextAtCursor(markdownContentInput, markdownImg);
            updatePreview();
        }
    });

    function insertTextAtCursor(textarea, text) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        textarea.value = value.substring(0, start) + text + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }

    // 3. Logic xem trước Markdown trực tiếp
    function updatePreview() {
        const markdownText = markdownContentInput.value;
        htmlPreview.innerHTML = marked.parse(markdownText);
    }
    markdownContentInput.addEventListener('input', updatePreview);

    // 4. Logic "Publish" (tạo và tải file)
    editorForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const fullContent = markdownContentInput.value;
        const lines = fullContent.split('\n');
        
        const title = lines.shift().trim();
        const markdownContent = lines.join('\n').trim();

        const excerpt = markdownContent.substring(0, 150).replace(/<[^>]*>/g, '').replace(/(\r\n|\n|\r)/gm, " ") + '...';
        const currentDate = new Date().toISOString().split('T')[0];

        if (!title || !coverImageUrl || !markdownContent) {
            alert('Please provide a title (first line), a cover image, and some content.');
            return;
        }

        const fileName = createSlug(title) + '.md';

        // Tải file .md
        const fileContent = createFileContent(title, currentDate, coverImageUrl, excerpt, markdownContent);
        downloadFile(fileName, fileContent);

        // **TÍNH NĂNG MỚI: Tải file posts.json đã được cập nhật**
        updateAndDownloadPostsJson(fileName);
        
        alert(`Successfully generated!\n\n1. ${fileName}\n2. posts.json\n\nPlease move these files to the correct folders in your project.`);
    });
    
    /**
     * **HÀM MỚI:** Tải file posts.json, thêm tên file mới, và kích hoạt tải xuống.
     */
    async function updateAndDownloadPostsJson(newFileName) {
        try {
            // Đọc file posts.json hiện tại
            const response = await fetch('posts/posts.json');
            let postsList = [];
            if (response.ok) {
                postsList = await response.json();
            }

            // Thêm tên file mới vào đầu danh sách (để bài mới nhất luôn ở trên)
            // Kiểm tra để tránh thêm trùng lặp
            if (!postsList.includes(newFileName)) {
                postsList.unshift(newFileName);
            }

            // Chuyển mảng object thành chuỗi JSON được định dạng đẹp
            const updatedJsonContent = JSON.stringify(postsList, null, 2);

            // Kích hoạt tải xuống file posts.json mới
            downloadFile('posts.json', updatedJsonContent);

        } catch (error) {
            console.error('Could not update posts.json:', error);
            alert('Could not update posts.json. Please update it manually.');
        }
    }

    function createFileContent(title, date, cover_image, excerpt, markdown) {
        return `---
title: "${title}"
date: "${date}"
cover_image: "${cover_image}"
excerpt: "${excerpt}"
---

${markdown}`;
    }

    function createSlug(title) {
        return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    
    function downloadFile(filename, content) {
        const element = document.createElement('a');
        const file = new Blob([content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // 5. Logic tải và hiển thị bài viết gần đây nhất (không thay đổi)
    async function loadRecentPost() {
        loadingRecentPost.style.display = 'block';
        try {
            const response = await fetch('posts/posts.json');
            if (!response.ok) throw new Error('Could not fetch posts list.');
            
            const postFiles = await response.json();
            if (postFiles.length === 0) {
                recentPostContainer.innerHTML = '<p>No posts available.</p>';
                return;
            }

            const latestPostFile = postFiles[0];
            const postResponse = await fetch(`posts/${latestPostFile}`);
            if (!postResponse.ok) throw new Error(`Could not fetch ${latestPostFile}`);
            
            const markdown = await postResponse.text();
            const frontMatter = jsyaml.load(/---\n([\s\S]+?)\n---/.exec(markdown)[1]);
            
            const post = { ...frontMatter, slug: latestPostFile.replace('.md', '') };
            recentPostContainer.innerHTML = createBlogCardHTML(post);

        } catch (error) {
            console.error('Failed to load recent post:', error);
            recentPostContainer.innerHTML = '<p>Could not load recent post.</p>';
        } finally {
            loadingRecentPost.style.display = 'none';
        }
    }

    function createBlogCardHTML(post) {
        const postUrl = `post.html?post=${post.slug}`;
        return `
            <article class="blog-card">
                <a href="${postUrl}" class="blog-card-image-link">
                    <img src="${post.cover_image}" alt="Cover for ${post.title}">
                </a>
                <div class="blog-card-content">
                    <p class="blog-date">${new Date(post.date).toLocaleDateString()}</p>
                    <h3><a href="${postUrl}">${post.title}</a></h3>
                    <p class="blog-excerpt">${post.excerpt}</p>
                    <a href="${postUrl}" class="btn btn-secondary">Read</a>
                </div>
            </article>
        `;
    }

    // --- INITIALIZATION ---
    loadRecentPost();
    updatePreview(); 
});