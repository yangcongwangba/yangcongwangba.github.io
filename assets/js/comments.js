// 评论系统实现
class GitHubComments {
    constructor(repo, issueId) {
        this.repo = repo;
        this.issueId = issueId;
        this.commentsContainer = document.getElementById('comments-container');
    }
    
    async loadComments() {
        try {
            const response = await fetch(`https://api.github.com/repos/${this.repo}/issues/${this.issueId}/comments`);
            const comments = await response.json();
            
            let commentsHtml = '<h3>评论 (' + comments.length + ')</h3>';
            
            if (comments.length === 0) {
                commentsHtml += '<p>暂无评论，成为第一个评论的人吧！</p>';
            } else {
                commentsHtml += '<ul class="comments-list">';
                comments.forEach(comment => {
                    const date = new Date(comment.created_at).toLocaleString();
                    commentsHtml += `
                        <li class="comment">
                            <div class="comment-header">
                                <img src="${comment.user.avatar_url}" alt="${comment.user.login}" class="avatar">
                                <span class="username">${comment.user.login}</span>
                                <span class="date">${date}</span>
                            </div>
                            <div class="comment-body">
                                ${this.renderMarkdown(comment.body)}
                            </div>
                        </li>
                    `;
                });
                commentsHtml += '</ul>';
            }
            
            commentsHtml += `
                <div class="comment-form">
                    <h4>发表评论</h4>
                    <p>通过 <a href="https://github.com/${this.repo}/issues/${this.issueId}" target="_blank">GitHub Issue #${this.issueId}</a> 发表评论</p>
                </div>
            `;
            
            this.commentsContainer.innerHTML = commentsHtml;
        } catch (error) {
            console.error('加载评论失败:', error);
            this.commentsContainer.innerHTML = '<p>评论加载失败，请稍后重试。</p>';
        }
    }
    
    renderMarkdown(text) {
        // 简单的Markdown转HTML
        // 实际使用可能需要更完善的Markdown解析器
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
}

// 在文章页面初始化评论系统
document.addEventListener('DOMContentLoaded', () => {
    const repo = 'username/username.github.io';
    const issueId = document.getElementById('comments-container').getAttribute('data-issue-id');
    
    if (issueId) {
        const commentSystem = new GitHubComments(repo, issueId);
        commentSystem.loadComments();
    }
}); 