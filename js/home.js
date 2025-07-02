/**
 * home.js - Xử lý logic cho trang chủ (index.html)
 *
 * Chức năng chính:
 * 1. Tải toàn bộ danh sách bài viết từ file `posts.json`.
 * 2. Hiển thị 6 bài viết đầu tiên.
 * 3. Nếu có nhiều hơn 6 bài viết, hiển thị nút "More".
 * 4. Khi nhấn "More", hiển thị các bài viết tiếp theo cho đến hết.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM ELEMENTS & STATE ---
    const blogGrid = document.getElementById('blog-grid');
    const loadingMessage = document.getElementById('loading-message');
    
    // Tạo một container cho nút "More" và chèn nó vào sau lưới blog
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    // Dùng insertAdjacentElement để đảm bảo vị trí chính xác
    if (blogGrid) {
        blogGrid.insertAdjacentElement('afterend', paginationContainer);
    }

    let allPosts = []; // Biến để lưu trữ tất cả bài viết sau khi tải
    const POSTS_PER_PAGE = 6; // Số lượng bài viết hiển thị mỗi lần

    /**
     * Hàm chính để tải và hiển thị bài viết.
     * Sử dụng async/await để xử lý các tác vụ bất đồng bộ một cách tuần tự.
     */
    async function loadPosts() {
        try {
            loadingMessage.style.display = 'block';

            // Tải file "mục lục" posts.json
            const response = await fetch('posts/posts.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const postFiles = await response.json();

            // Nếu không có bài viết nào, hiển thị thông báo và kết thúc
            if (postFiles.length === 0) {
                blogGrid.innerHTML = '<p>No posts found.</p>';
                return;
            }

            // Tải nội dung của tất cả các file .md một cách đồng thời
            const postsData = await Promise.all(
                postFiles.map(async (file) => {
                    try {
                        const postResponse = await fetch(`posts/${file}`);
                        if (!postResponse.ok) return null; // Bỏ qua nếu file không tải được
                        
                        const markdown = await postResponse.text();
                        const frontMatter = parseFrontMatter(markdown);
                        
                        // Trả về object bài viết hoàn chỉnh
                        return {
                            ...frontMatter,
                            slug: file.replace('.md', '') 
                        };
                    } catch (e) {
                        console.error(`Error fetching or parsing ${file}:`, e);
                        return null; // Bỏ qua bài viết bị lỗi
                    }
                })
            );

            // Lọc ra các bài viết hợp lệ và sắp xếp theo ngày tháng mới nhất
            allPosts = postsData
                .filter(post => post && post.date) // Đảm bảo bài viết có dữ liệu và ngày tháng
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            // Hiển thị 6 bài viết đầu tiên
            displayPosts(allPosts.slice(0, POSTS_PER_PAGE));
            
            // Kiểm tra và hiển thị nút "More" nếu cần
            setupPagination();

        } catch (error) {
            console.error('Failed to load posts:', error);
            blogGrid.innerHTML = '<p>Sorry, something went wrong while loading the posts. Please try again later.</p>';
        } finally {
            // Luôn ẩn thông báo tải sau khi hoàn tất
            loadingMessage.style.display = 'none';
        }
    }

    /**
     * Hàm hiển thị một danh sách các bài viết vào lưới.
     * @param {Array} posts - Mảng các object bài viết cần hiển thị.
     */
    function displayPosts(posts) {
        // Tạo chuỗi HTML từ mảng các bài viết
        const postsHtml = posts.map(post => createBlogCardHTML(post)).join('');
        // Nối thêm bài viết vào lưới thay vì ghi đè
        if (blogGrid) {
            blogGrid.innerHTML += postsHtml;
        }
    }

    /**
     * Hàm thiết lập và quản lý nút "More".
     * Nó sẽ kiểm tra xem có cần hiển thị nút không và xử lý sự kiện click.
     */
    function setupPagination() {
        // Xóa nút "More" cũ trước khi kiểm tra lại
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }

        const currentlyDisplayedCount = blogGrid ? blogGrid.children.length : 0;
        
        // Nếu tổng số bài viết lớn hơn số bài đã hiển thị
        if (allPosts.length > currentlyDisplayedCount) {
            const moreButton = document.createElement('button');
            moreButton.textContent = 'More Posts';
            moreButton.classList.add('btn', 'btn-primary', 'more-button');
            
            moreButton.addEventListener('click', () => {
                // Lấy các bài viết tiếp theo để hiển thị
                const nextPosts = allPosts.slice(currentlyDisplayedCount, currentlyDisplayedCount + POSTS_PER_PAGE);
                displayPosts(nextPosts);
                
                // Sau khi hiển thị, kiểm tra lại xem có cần nút "More" nữa không
                // Nếu không còn bài nào, nút sẽ không được tạo lại
                setupPagination();
            });
            
            if (paginationContainer) {
                paginationContainer.appendChild(moreButton);
            }
        }
    }


    /**
     * Phân tích Front Matter (khối YAML ở đầu file .md) từ một chuỗi markdown.
     * @param {string} markdown - Toàn bộ nội dung của file .md.
     * @returns {object} - Một object chứa các thuộc tính từ Front Matter.
     */
    function parseFrontMatter(markdown) {
        try {
            const match = /---\n([\s\S]+?)\n---/.exec(markdown);
            if (!match) return {}; // Trả về object rỗng nếu không có Front Matter
            // Dùng thư viện js-yaml để chuyển đổi chuỗi YAML thành object JavaScript
            return jsyaml.load(match[1]);
        } catch (e) {
            console.error('Error parsing front matter:', e);
            return {};
        }
    }

    /**
     * Tạo một chuỗi HTML cho một thẻ bài viết (blog card).
     * @param {object} post - Object chứa thông tin bài viết (title, date, cover_image, excerpt, slug).
     * @returns {string} - Chuỗi HTML của thẻ bài viết.
     */
    function createBlogCardHTML(post) {
        // Định dạng lại ngày tháng cho dễ đọc, ví dụ: "May 15, 2024"
        const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        // Tạo URL đến trang chi tiết bài viết, sử dụng query parameter
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

    // Gọi hàm chính để bắt đầu quá trình tải và hiển thị bài viết khi trang được tải
    loadPosts();
});
