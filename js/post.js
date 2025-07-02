/**
 * post.js - Logic cho trang chi tiết bài viết (post.html)
 *
 * --- PHIÊN BẢN NÂNG CẤP ---
 * Chức năng:
 * 1. Lấy 'slug' của bài viết từ URL query parameter.
 * 2. Tải file .md tương ứng.
 * 3. Phân tích Front Matter và nội dung Markdown.
 * 4. Hiển thị nội dung lên trang.
 * 5. Tải danh sách bài viết từ GitHub API để hiển thị các bài viết liên quan.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const postHeader = document.getElementById('post-header');
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postBody = document.getElementById('post-body');
    const relatedPostsGrid = document.getElementById('related-posts-grid');

    // --- MAIN LOGIC ---

    function getPostSlugFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('post');
    }

    async function loadPost() {
        const slug = getPostSlugFromURL();

        if (!slug) {
            postBody.innerHTML = '<p>Error: Post not found. No post identifier provided in the URL.</p>';
            return;
        }

        try {
            const response = await fetch(`posts/${slug}.md`);
            if (!response.ok) {
                throw new Error(`Could not find post: ${slug}.md`);
            }
            const markdown = await response.text();
            
            const { attributes, body } = parseFrontMatterAndBody(markdown);

            document.title = attributes.title;
            postHeader.style.backgroundImage = `url(${attributes.cover_image})`;
            postTitle.textContent = attributes.title;
            postDate.textContent = `Published on: ${new Date(attributes.date).toLocaleDateString('en-GB')}`;
            postBody.innerHTML = marked.parse(body);
            
            // Tải các bài viết liên quan sau khi đã hiển thị bài chính
            loadRelatedPosts(slug);

        } catch (error) {
            console.error('Error loading post:', error);
            postBody.innerHTML = `<p>Sorry, we couldn't load this post. It might have been moved or deleted.</p>`;
        }
    }

    /**
     * Tải và hiển thị các bài viết liên quan.
     */
    async function loadRelatedPosts(currentSlug) {
        try {
            // =================================================================
            // *** THAY ĐỔI CỐT LÕI BẮT ĐẦU TỪ ĐÂY ***
            const GITHUB_USERNAME = 'aca-and-pd';
            const GITHUB_REPO = 'SNLT-HK3';
            const repoURL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/posts`;

            const response = await fetch(repoURL);
            if (!response.ok) return; // Không hiển thị bài liên quan nếu API lỗi

            const contents = await response.json();
            const postFiles = contents
                .filter(item => item.type === 'file' && item.name.endsWith('.md'))
                .map(item => item.name);
            // *** KẾT THÚC THAY ĐỔI CỐT LÕI ***
            // =================================================================

            // Lọc ra bài viết hiện tại và chỉ lấy 3 bài viết khác
            const relatedPostFiles = postFiles
                .filter(file => file !== `${currentSlug}.md`)
                .slice(0, 3);

            if (relatedPostFiles.length === 0) return;

            const postsData = await Promise.all(
                relatedPostFiles.map(async file => {
                    try {
                        const postResponse = await fetch(`posts/${file}`);
                        if (!postResponse.ok) return null;
                        const markdown = await postResponse.text();
                        // Chỉ cần Front Matter cho card
                        const { attributes } = parseFrontMatterAndBody(markdown);
                        return {
                            ...attributes,
                            slug: file.replace('.md', '')
                        };
                    } catch (e) {
                        return null; // Bỏ qua nếu có lỗi
                    }
                })
            );
            
            const validPosts = postsData.filter(p => p);
            if (relatedPostsGrid) {
                relatedPostsGrid.innerHTML = validPosts.map(createBlogCardHTML).join('');
            }

        } catch (error) {
            console.error('Error loading related posts:', error);
        }
    }

    /**
     * Hàm phân tích cả Front Matter và Body từ markdown.
     */
    function parseFrontMatterAndBody(markdown) {
        const match = /---\n([\s\S]+?)\n---/.exec(markdown);
        // Trả về object rỗng nếu không có Front Matter
        const attributes = match ? jsyaml.load(match[1]) : {};
        const body = match ? markdown.slice(match[0].length) : markdown;
        
        return { attributes, body };
    }

    /**
     * Hàm tạo HTML cho thẻ bài viết (tái sử dụng).
     */
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
    loadPost();
});
