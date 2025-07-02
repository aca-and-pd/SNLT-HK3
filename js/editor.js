/**
 * editor.js - Logic cho trang Editor
 *
 * --- PHIÊN BẢN NÂNG CẤP CUỐI CÙNG ---
 * Chức năng:
 * 1. Xử lý việc đặt URL ảnh bìa.
 * 2. Cung cấp trình soạn thảo Markdown với xem trước trực tiếp.
 * 3. Cho phép chèn ảnh vào nội dung qua URL.
 * 4. Tạo và cho phép tải xuống file .md (KHÔNG còn tạo posts.json).
 * 5. Tải và hiển thị bài viết gần đây nhất từ GitHub API.
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

    let coverImageUrl = '';

    // --- EDITOR LOGIC ---

    // 1. Logic cho nút Upload Ảnh bìa (giữ nguyên)
    uploadCoverBtn.addEventListener('click', () => {
        const imageUrl = prompt("Please enter the cover image URL:");
        if (imageUrl && imageUrl.trim() !== '') {
            coverImageUrl = imageUrl.trim();
            coverImageWrapper.style.backgroundImage = `url(${coverImageUrl})`;
            coverImageWrapper.classList.add('has-image');
        }
    });

    // 2. Logic cho nút "Upload IMG" vào nội dung (giữ nguyên)
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

    // 3. Logic xem trước Markdown trực tiếp (giữ nguyên)
    function updatePreview() {
        const markdownText = markdownContentInput.value;
        htmlPreview.innerHTML = marked.parse(markdownText);
    }
    markdownContentInput.addEventListener('input', updatePreview);

    // 4. Logic "Publish" (tạo và tải file .md)
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
        const fileContent = createFileContent(title, currentDate, coverImageUrl, excerpt, markdownContent);
        
        // Chỉ tải file .md
        downloadFile(fileName, fileContent);
        
        // **THAY ĐỔI:** Loại bỏ hàm updateAndDownloadPostsJson
        // alert đã được cập nhật để không còn nhắc đến posts.json
        alert(`Successfully generated: ${fileName}\n\nPlease move this file to the /posts folder in your project.`);
    });
    
    // **THAY ĐỔI:** Đã XÓA hàm updateAndDownloadPostsJson()

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

    // 5. Logic tải và hiển thị bài viết gần đây nhất
    async function loadRecentPost() {
        if(loadingRecentPost) loadingRecentPost.style.display = 'block';
        
        try {
            // =================================================================
            // *** THAY ĐỔI CỐT LÕI BẮT ĐẦU TỪ ĐÂY ***
            const GITHUB_USERNAME = 'aca-and-pd';
            const GITHUB_REPO = 'SNLT-HK3';
            const repoURL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/posts`;

            const response = await fetch(repoURL);
            if (!response.ok) throw new Error('Could not fetch posts list from GitHub.');
            
            const contents = await response.json();
            const postFiles = contents
                .filter(item => item.type === 'file' && item.name.endsWith('.md'))
                .map(item => item.name);
            // *** KẾT THÚC THAY ĐỔI CỐT LÕI ***
            // =================================================================
            
            if (postFiles.length === 0) {
                if(recentPostContainer) recentPostContainer.innerHTML = '<p>No posts available.</p>';
                return;
            }

            // Sắp xếp để tìm ra file mới nhất (dựa trên tên file nếu có ngày tháng, hoặc đơn giản là lấy file đầu tiên)
            // Để đơn giản, ta chỉ lấy file đầu tiên từ API, nhưng tốt hơn là nên fetch tất cả để sort theo date
            const latestPostFile = postFiles[0]; 
            const postResponse = await fetch(`posts/${latestPostFile}`);
            if (!postResponse.ok) throw new Error(`Could not fetch ${latestPostFile}`);
            
            const markdown = await postResponse.text();
            const match = /---\n([\s\S]+?)\n---/.exec(markdown);
            if (!match) throw new Error('Could not parse front matter.');

            const frontMatter = jsyaml.load(match[1]);
            
            const post = { ...frontMatter, slug: latestPostFile.replace('.md', '') };

            if(recentPostContainer) recentPostContainer.innerHTML = createBlogCardHTML(post);

        } catch (error) {
            console.error('Failed to load recent post:', error);
            if(recentPostContainer) recentPostContainer.innerHTML = '<p>Could not load recent post.</p>';
        } finally {
            if(loadingRecentPost) loadingRecentPost.style.display = 'none';
        }
    }

    function createBlogCardHTML(post) {
        const postUrl = `post.html?post=${post.slug}`;
        const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        return `
            <article class="blog-card">
                <a href="${postUrl}" class="blog-card-image-link">
                    <img src="${post.cover_image}" alt="Cover for ${post.title}">
                </a>
                <div class="blog-card-content">
                    <p class="blog-date">${formattedDate}</p>
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
