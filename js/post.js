/**
 * post.js - Logic cho trang chi tiết bài viết (post.html)
 *
 * Chức năng:
 * 1. Lấy 'slug' của bài viết từ URL query parameter.
 * 2. Tải file .md tương ứng.
 * 3. Phân tích Front Matter và nội dung Markdown.
 * 4. Hiển thị nội dung lên trang.
 * 5. Tải và hiển thị các bài viết liên quan.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const postHeader = document.getElementById('post-header');
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postBody = document.getElementById('post-body');
    const relatedPostsGrid = document.getElementById('related-posts-grid');

    // --- MAIN LOGIC ---

    /**
     * Lấy 'slug' bài viết từ URL.
     * Ví dụ: "post.html?post=my-first-post" -> trả về "my-first-post"
     */
    function getPostSlugFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('post');
    }

    /**
     * Hàm chính để tải và hiển thị bài viết.
     */
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
            
            // Phân tích Front Matter và nội dung
            const { attributes, body } = parseFrontMatterAndBody(markdown);

            // Cập nhật giao diện với dữ liệu đã lấy được
            document.title = attributes.title; // Cập nhật tiêu đề tab trình duyệt
            postHeader.style.backgroundImage = `url(${attributes.cover_image})`;
            postTitle.textContent = attributes.title;
            postDate.textContent = `Published on: ${new Date(attributes.date).toLocaleDateString('en-GB')}`;
            
            // Chuyển đổi nội dung Markdown sang HTML và hiển thị
            postBody.innerHTML = marked.parse(body);
            
            // Tải các bài viết liên quan
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
            const response = await fetch('posts/posts.json');
            if (!response.ok) return;

            let postFiles = await response.json();
            
            // Lọc ra bài viết hiện tại và chỉ lấy 3 bài viết khác
            const relatedPostFiles = postFiles
                .filter(file => file !== `${currentSlug}.md`)
                .slice(0, 3);

            if (relatedPostFiles.length === 0) return;

            const postsData = await Promise.all(
                relatedPostFiles.map(async file => {
                    const postResponse = await fetch(`posts/${file}`);
                    if (!postResponse.ok) return null;
                    const markdown = await postResponse.text();
                    const { attributes } = parseFrontMatterAndBody(markdown);
                    return {
                        ...attributes,
                        slug: file.replace('.md', '')
                    };
                })
            );
            
            const validPosts = postsData.filter(p => p);
            relatedPostsGrid.innerHTML = validPosts.map(createBlogCardHTML).join('');

        } catch (error) {
            console.error('Error loading related posts:', error);
        }
    }

    /**
     * Hàm phân tích cả Front Matter và Body từ markdown.
     */
    function parseFrontMatterAndBody(markdown) {
        const match = /---\n([\s\S]+?)\n---/.exec(markdown);
        const frontMatter = match ? match[1] : '';
        const body = match ? markdown.slice(match[0].length) : markdown;
        
        const attributes = jsyaml.load(frontMatter);
        return { attributes, body };
    }

    /**
     * Hàm tạo HTML cho thẻ bài viết (tái sử dụng).
     */
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
    loadPost();
});