// Vekipedia - メインアプリケーション
class Vekipedia {
    constructor() {
        this.currentArticles = [];
        this.allPrefectures = [];
        this.allCategories = [];
        this.currentFilter = {
            prefecture: null,
            category: null,
            search: ''
        };
        this.init();
    }

    async init() {
        try {
            // データを取得
            await this.loadPrefectures();
            await this.loadCategories();
            await this.loadArticles();
            
            // UIを初期化
            this.setupEventListeners();
            this.renderPrefectures();
            this.renderCategories();
            this.renderArticles();
            this.updateStats();
            
        } catch (error) {
            console.error('アプリケーションの初期化に失敗:', error);
            this.showError('データの読み込みに失敗しました。ページを再読み込みしてください。');
        }
    }

    // データ取得メソッド
    async loadPrefectures() {
        try {
            const response = await fetch('tables/prefectures');
            const result = await response.json();
            this.allPrefectures = result.data || [];
        } catch (error) {
            console.error('都道府県データの取得に失敗:', error);
            this.allPrefectures = [];
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('tables/categories');
            const result = await response.json();
            this.allCategories = result.data || [];
        } catch (error) {
            console.error('カテゴリデータの取得に失敗:', error);
            this.allCategories = [];
        }
    }

    async loadArticles() {
        try {
            const response = await fetch('tables/articles?limit=100&sort=created_at&status=published');
            const result = await response.json();
            this.currentArticles = result.data || [];
        } catch (error) {
            console.error('記事データの取得に失敗:', error);
            this.currentArticles = [];
        }
    }

    // UI レンダリング
    renderPrefectures() {
        const grid = document.getElementById('prefectureGrid');
        if (!grid) return;

        grid.innerHTML = this.allPrefectures.map(pref => `
            <button onclick="app.filterByPrefecture('${pref.id}')" 
                    class="prefecture-btn ${pref.id} text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg hover:shadow-md transition ${this.currentFilter.prefecture === pref.id ? 'active' : ''}">
                ${pref.name}
                ${pref.article_count > 0 ? `<span class="ml-1 text-xs bg-red-100 text-red-600 px-1 rounded">${pref.article_count}</span>` : ''}
            </button>
        `).join('');

        // 都道府県選択肢をフォームにも追加
        const prefSelect = document.getElementById('articlePrefecture');
        if (prefSelect) {
            prefSelect.innerHTML = '<option value="">都道府県を選択</option>' +
                this.allPrefectures.map(pref => 
                    `<option value="${pref.id}">${pref.name}</option>`
                ).join('');
        }
    }

    renderCategories() {
        const container = document.getElementById('categoryButtons');
        if (!container) return;

        container.innerHTML = this.allCategories.map(cat => `
            <button onclick="app.filterByCategory('${cat.id}')" 
                    class="category-btn text-sm px-4 py-2 bg-white border border-gray-200 rounded-lg hover:shadow-md transition flex items-center ${this.currentFilter.category === cat.id ? 'active' : ''}">
                <i class="${cat.icon} mr-2 text-${cat.color}-500"></i>
                ${cat.name}
                ${cat.article_count > 0 ? `<span class="ml-2 text-xs bg-gray-100 text-gray-600 px-1 rounded">${cat.article_count}</span>` : ''}
            </button>
        `).join('');

        // カテゴリ選択肢をフォームにも追加
        const catSelect = document.getElementById('articleCategory');
        if (catSelect) {
            catSelect.innerHTML = '<option value="">カテゴリを選択</option>' +
                this.allCategories.map(cat => 
                    `<option value="${cat.id}">${cat.name}</option>`
                ).join('');
        }
    }

    renderArticles() {
        const container = document.getElementById('articlesList');
        const noArticlesMsg = document.getElementById('noArticlesMessage');
        
        if (!container) return;

        let filteredArticles = this.currentArticles;

        // フィルタリング
        if (this.currentFilter.prefecture) {
            filteredArticles = filteredArticles.filter(article => 
                article.prefecture_id === this.currentFilter.prefecture
            );
        }

        if (this.currentFilter.category) {
            filteredArticles = filteredArticles.filter(article => 
                article.category_id === this.currentFilter.category
            );
        }

        if (this.currentFilter.search) {
            const searchTerm = this.currentFilter.search.toLowerCase();
            filteredArticles = filteredArticles.filter(article =>
                article.title.toLowerCase().includes(searchTerm) ||
                article.content.toLowerCase().includes(searchTerm)
            );
        }

        // 記事表示/非表示
        if (filteredArticles.length === 0) {
            container.style.display = 'none';
            noArticlesMsg.style.display = 'block';
        } else {
            container.style.display = 'block';
            noArticlesMsg.style.display = 'none';

            container.innerHTML = filteredArticles.map(article => {
                const prefecture = this.allPrefectures.find(p => p.id === article.prefecture_id);
                const category = this.allCategories.find(c => c.id === article.category_id);
                const createdDate = new Date(article.created_at).toLocaleDateString('ja-JP');
                
                return `
                    <article onclick="app.showArticle('${article.id}')" class="article-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition">
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="text-lg font-semibold text-gray-900 line-clamp-2">${article.title}</h3>
                            <div class="flex items-center space-x-2 ml-4">
                                ${article.likes ? `<span class="text-sm text-gray-500"><i class="far fa-heart mr-1"></i>${article.likes}</span>` : ''}
                                ${article.views ? `<span class="text-sm text-gray-500"><i class="fas fa-eye mr-1"></i>${article.views}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center space-x-3 mb-3">
                            ${prefecture ? `<span class="badge badge-primary">${prefecture.name}</span>` : ''}
                            ${category ? `<span class="badge badge-secondary"><i class="${category.icon} mr-1"></i>${category.name}</span>` : ''}
                        </div>
                        <p class="text-gray-600 text-sm line-clamp-3 mb-3">${this.truncateContent(article.content, 150)}</p>
                        <div class="flex justify-between items-center text-xs text-gray-500">
                            <span>投稿者: ${article.author || '匿名'}</span>
                            <span>${createdDate}</span>
                        </div>
                    </article>
                `;
            }).join('');
        }

        // タイトル更新
        this.updateArticlesTitle(filteredArticles.length);
    }

    // フィルタリング機能
    filterByPrefecture(prefectureId) {
        if (this.currentFilter.prefecture === prefectureId) {
            this.currentFilter.prefecture = null;
        } else {
            this.currentFilter.prefecture = prefectureId;
        }
        this.renderPrefectures();
        this.renderArticles();
        this.updateClearButton();
    }

    filterByCategory(categoryId) {
        if (this.currentFilter.category === categoryId) {
            this.currentFilter.category = null;
        } else {
            this.currentFilter.category = categoryId;
        }
        this.renderCategories();
        this.renderArticles();
        this.updateClearButton();
    }

    filterBySearch(searchTerm) {
        this.currentFilter.search = searchTerm;
        this.renderArticles();
        this.updateClearButton();
    }

    clearFilters() {
        this.currentFilter = { prefecture: null, category: null, search: '' };
        document.getElementById('searchInput').value = '';
        this.renderPrefectures();
        this.renderCategories();
        this.renderArticles();
        this.updateClearButton();
    }

    updateClearButton() {
        const btn = document.getElementById('clearFiltersBtn');
        const hasFilters = this.currentFilter.prefecture || this.currentFilter.category || this.currentFilter.search;
        btn.style.display = hasFilters ? 'inline-block' : 'none';
    }

    updateArticlesTitle(count) {
        const title = document.getElementById('articlesTitle');
        if (title) {
            if (this.currentFilter.prefecture || this.currentFilter.category || this.currentFilter.search) {
                title.textContent = `検索結果 (${count}件)`;
            } else {
                title.textContent = '最新の記事';
            }
        }
    }

    // 記事詳細表示
    async showArticle(articleId) {
        try {
            const response = await fetch(`tables/articles/${articleId}`);
            const article = await response.json();
            
            const prefecture = this.allPrefectures.find(p => p.id === article.prefecture_id);
            const category = this.allCategories.find(c => c.id === article.category_id);
            
            document.getElementById('modalTitle').textContent = article.title;
            document.getElementById('modalContent').innerHTML = this.formatContent(article.content);
            document.getElementById('modalMeta').innerHTML = `
                ${prefecture ? `<span class="badge badge-primary">${prefecture.name}</span>` : ''}
                ${category ? `<span class="badge badge-secondary"><i class="${category.icon} mr-1"></i>${category.name}</span>` : ''}
                <span><i class="fas fa-calendar mr-1"></i>${new Date(article.created_at).toLocaleDateString('ja-JP')}</span>
                ${article.updated_at !== article.created_at ? `<span><i class="fas fa-edit mr-1"></i>更新: ${new Date(article.updated_at).toLocaleDateString('ja-JP')}</span>` : ''}
            `;
            document.getElementById('modalAuthor').textContent = `投稿者: ${article.author || '匿名'}`;
            document.getElementById('likeCount').textContent = article.likes || 0;

            // ビュー数を増加
            await this.incrementViews(articleId);
            
            this.showModal('articleModal');
        } catch (error) {
            console.error('記事の取得に失敗:', error);
            this.showError('記事の表示に失敗しました。');
        }
    }

    // 記事投稿
    async submitArticle(formData) {
        try {
            const articleData = {
                title: formData.get('title'),
                content: formData.get('content'),
                prefecture_id: formData.get('prefecture'),
                category_id: formData.get('category'),
                author: formData.get('author') || '匿名',
                status: 'published',
                likes: 0,
                views: 0,
                slug: this.generateSlug(formData.get('title')),
                tags: []
            };

            const response = await fetch('tables/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(articleData)
            });

            if (response.ok) {
                this.showSuccess('記事が投稿されました！');
                this.hideModal('addArticleModal');
                await this.loadArticles();
                this.renderArticles();
                this.updateStats();
                // フォームをリセット
                document.getElementById('addArticleForm').reset();
            } else {
                throw new Error('投稿に失敗しました');
            }
        } catch (error) {
            console.error('記事の投稿に失敗:', error);
            this.showError('記事の投稿に失敗しました。');
        }
    }

    // いいね機能
    async likeArticle(articleId) {
        try {
            // 現在表示中の記事IDを取得（実装を簡略化）
            const currentArticleId = this.currentDisplayedArticleId;
            if (!currentArticleId) return;

            const response = await fetch(`tables/articles/${currentArticleId}`);
            const article = await response.json();
            
            const newLikes = (article.likes || 0) + 1;
            
            await fetch(`tables/articles/${currentArticleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ likes: newLikes })
            });

            document.getElementById('likeCount').textContent = newLikes;
            
            // アニメーション効果
            const icon = document.getElementById('likeIcon');
            icon.className = 'fas fa-heart text-red-500';
            icon.parentElement.classList.add('like-animation');
            
            setTimeout(() => {
                icon.parentElement.classList.remove('like-animation');
            }, 600);

        } catch (error) {
            console.error('いいねの処理に失敗:', error);
        }
    }

    // ビュー数増加
    async incrementViews(articleId) {
        try {
            const response = await fetch(`tables/articles/${articleId}`);
            const article = await response.json();
            
            const newViews = (article.views || 0) + 1;
            
            await fetch(`tables/articles/${articleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ views: newViews })
            });

            this.currentDisplayedArticleId = articleId;
        } catch (error) {
            console.error('ビュー数の更新に失敗:', error);
        }
    }

    // 統計更新
    updateStats() {
        const totalArticles = this.currentArticles.length;
        const totalPrefectures = this.allPrefectures.filter(p => p.article_count > 0).length;
        
        document.getElementById('totalArticles').textContent = totalArticles;
        document.getElementById('totalPrefectures').textContent = totalPrefectures;
    }

    // イベントリスナー設定
    setupEventListeners() {
        // 検索機能
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterBySearch(e.target.value);
            });
        }

        // 記事投稿フォーム
        const addArticleForm = document.getElementById('addArticleForm');
        if (addArticleForm) {
            addArticleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                this.submitArticle(formData);
            });
        }

        // Escキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });

        // モーダル背景クリックで閉じる
        document.querySelectorAll('[id$="Modal"]').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    // ユーティリティメソッド
    truncateContent(content, length) {
        const text = content.replace(/<[^>]*>/g, ''); // HTMLタグを除去
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    formatContent(content) {
        // 簡単なMarkdown風フォーマット
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/gm, '<p>$1</p>')
            .replace(/<p><\/p>/g, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }

    // モーダル管理
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.querySelector('.bg-white').classList.add('modal-enter');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const content = modal.querySelector('.bg-white');
            content.classList.add('modal-exit');
            setTimeout(() => {
                modal.style.display = 'none';
                content.classList.remove('modal-enter', 'modal-exit');
                document.body.style.overflow = '';
            }, 200);
        }
    }

    hideAllModals() {
        document.querySelectorAll('[id$="Modal"]').forEach(modal => {
            if (modal.style.display === 'flex') {
                this.hideModal(modal.id);
            }
        });
    }

    // 通知システム
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // アニメーション
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// グローバル関数（HTMLから呼び出し用）
function showAddArticleModal() {
    app.showModal('addArticleModal');
}

function hideAddArticleModal() {
    app.hideModal('addArticleModal');
}

function hideArticleModal() {
    app.hideModal('articleModal');
}

function clearFilters() {
    app.clearFilters();
}

function likeArticle() {
    app.likeArticle();
}

function editArticle() {
    // 編集機能は今後実装
    app.showError('編集機能は準備中です。');
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new Vekipedia();
});