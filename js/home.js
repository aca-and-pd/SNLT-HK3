/**
 * home.js - Xử lý logic cho trang chủ (index.html)
 *
 * --- PHIÊN BẢN NÂNG CẤP ---
 * Chức năng chính:
 * 1. Tải danh sách bài viết trực tiếp từ GitHub API, không cần file posts.json.
 * 2. Hiển thị 6 bài viết đầu tiên.
 * 3. Nếu có nhiều hơn 6 bài viết, hiển thị nút "More".
 * 4. Khi nhấn "More", hiển thị các bài viết tiếp theo cho đến hết.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM ELEMENTS & STATE ---
    const blogGrid = document.getElementById('blog-grid');
    const loadingMessage = document.getElementById('loading-message');
    
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    if (blogGrid) {
        blogGrid.insertAdjacentElement('afterend', paginationContainer);
    }

    let allPosts = [];
    const POSTS_PER_PAGE = 6;

    /**
     * Hàm chính để tải và hiển thị bài viết.
     */
    async function loadPosts() {
        try {
            loadingMessage.style.display = 'block';

            // =================================================================
            // *** THAY ĐỔI CỐT LÕI BẮT ĐẦU TỪ ĐÂY ***
            // Thay vì fetch('posts/posts.json'), chúng ta gọi trực tiếp GitHub API
            
            // Thay đổi 'YourUsername/YourRepo' thành thông tin của bạn
            const GITHUB_USERNAME = 'aca-and-pd';
            const GITHUB_REPO = 'SNLT-HK3';
            const repoURL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/posts`;

            const response = await fetch(repoURL);
            if (!response.ok) {
                throw new Error(`GitHub API error! status: ${response.status}`);
            }
            const contents = await response.json();

            // Từ kết quả API, lọc ra chỉ những file có đuôi .md
            const postFiles = contents
                .filter(item => item.type === 'file' && item.name.endsWith('.md'))
                .map(item => item.name); // Lấy ra một mảng chỉ chứa tên file
            
            // *** KẾT THÚC THAY ĐỔI CỐT LÕI ***
            // =================================================================

            if (postFiles.length === 0) {
                blogGrid.innerHTML = '<p>No posts found.</p>';
                return;
            }

            // Tải nội dung của tất cả các file .md một cách đồng thời
            // (Phần này giữ nguyên, chỉ thay đổi nguồn của `postFiles`)
            const postsData = await Promise.all(
                postFiles.map(async (file) => {
                    try {
                        const postResponse = await fetch(`posts/${file}`);
                        if (!postResponse.ok) return null;
                        
                        const markdown = await postResponse.text();
                        const frontMatter = parseFrontMatter(markdown);
                        
                        return {
                            ...frontMatter,
                            slug: file.replace('.md', '') 
                        };
                    } catch (e) {
                        console.error(`Error fetching or parsing ${file}:`, e);
                        return null;
                    }
                })
            );

            // Lọc và sắp xếp (giữ nguyên)
            allPosts = postsData
                .filter(post => post && post.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            // Hiển thị và phân trang (giữ nguyên)
            displayPosts(allPosts.slice(0, POSTS_PER_PAGE));
            setupPagination();

        } catch (error) {
            console.error('Failed to load posts:', error);
            blogGrid.innerHTML = '<p>Sorry, something went wrong while loading the posts. Please try again later.</p>';
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    // Các hàm displayPosts, setupPagination, parseFrontMatter, createBlogCardHTML
    // giữ nguyên hoàn toàn, không cần thay đổi.

    function displayPosts(posts) {
        const postsHtml = posts.map(post => createBlogCardHTML(post)).join('');
        if (blogGrid) {
            blogGrid.innerHTML += postsHtml;
        }
    }

    function setupPagination() {
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        const currentlyDisplayedCount = blogGrid ? blogGrid.children.length : 0;
        if (allPosts.length > currentlyDisplayedCount) {
            const moreButton = document.createElement('button');
            moreButton.textContent = 'More Posts';
            moreButton.classList.add('btn', 'btn-primary', 'more-button');
            moreButton.addEventListener('click', () => {
                const nextPosts = allPosts.slice(currentlyDisplayedCount, currentlyDisplayedCount + POSTS_PER_PAGE);
                displayPosts(nextPosts);
                setupPagination();
            });
            if (paginationContainer) {
                paginationContainer.appendChild(moreButton);
            }
        }
    }

    function parseFrontMatter(markdown) {
        try {
            const match = /---\n([\s\S]+?)\n---/.exec(markdown);
            if (!match) return {};
            return jsyaml.load(match[1]);
        } catch (e) {
            console.error('Error parsing front matter:', e);
            return {};
        }
    }

    function createBlogCardHTML(post) {
        const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const postUrl = `post.html?post=${post.slug}`;
        return `
            <article class="blog-card">
                <a href="${postUrl}" class="blog-card-image-link">
                    <img src="${post.cover_image}" alt="Cover image for ${post.title}">
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

    // Gọi hàm chính để bắt đầu
    loadPosts();
});
