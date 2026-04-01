// File Share Hub JavaScript
class FileShareHub {
    constructor() {
        this.files = [];
        this.currentFilter = '';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.isAdmin = false;
        this.adminPassword = 'admin123'; // Change this for better security
        this.init();
    }

    init() {
        this.loadFilesFromStorage();
        this.checkAdminStatus();
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // File upload
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');

        dropZone.addEventListener('click', () => fileInput.click());
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });

        // Admin login
        document.getElementById('adminBtn').addEventListener('click', () => {
            this.showLoginModal();
        });

        document.getElementById('showLoginBtn').addEventListener('click', () => {
            this.showLoginModal();
        });

        document.getElementById('closeLogin').addEventListener('click', () => {
            this.hideLoginModal();
        });

        document.getElementById('cancelLogin').addEventListener('click', () => {
            this.hideLoginModal();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.updateUI();
        });

        document.getElementById('fileTypeFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.updateUI();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.updateUI();
        });

        // Clear all
        document.getElementById('clearAll').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete all files?')) {
                this.clearAllFiles();
            }
        });

        // Preview modal
        document.getElementById('closePreview').addEventListener('click', () => {
            this.closePreview();
        });

        document.getElementById('previewModal').addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') {
                this.closePreview();
            }
        });
    }

    handleFileSelect(files) {
        const uploadProgress = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        uploadProgress.classList.remove('hidden');
        
        const validFiles = Array.from(files).filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            uploadProgress.classList.add('hidden');
            this.showToast('No valid files selected', 'error');
            return;
        }

        let uploadedCount = 0;
        const totalFiles = validFiles.length;

        validFiles.forEach((file, index) => {
            setTimeout(() => {
                this.uploadFile(file);
                uploadedCount++;
                const progress = Math.round((uploadedCount / totalFiles) * 100);
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;

                if (uploadedCount === totalFiles) {
                    setTimeout(() => {
                        uploadProgress.classList.add('hidden');
                        progressBar.style.width = '0%';
                        progressText.textContent = '0%';
                    }, 500);
                }
            }, index * 100);
        });
    }

    validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'application/zip',
            'application/x-zip-compressed'
        ];

        if (file.size > maxSize) {
            this.showToast(`File "${file.name}" is too large (max 50MB)`, 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
            this.showToast(`File "${file.name}" is not supported`, 'error');
            return false;
        }

        return true;
    }

    uploadFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const fileData = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                uploadDate: new Date().toISOString(),
                data: e.target.result
            };

            this.files.push(fileData);
            this.saveFilesToStorage();
            this.updateUI();
            this.showToast(`"${file.name}" uploaded successfully`, 'success');
        };

        reader.onerror = () => {
            this.showToast(`Failed to read file "${file.name}"`, 'error');
        };

        reader.readAsDataURL(file);
    }

    deleteFile(fileId) {
        if (confirm('Are you sure you want to delete this file?')) {
            this.files = this.files.filter(file => file.id !== fileId);
            this.saveFilesToStorage();
            this.updateUI();
            this.showToast('File deleted successfully', 'success');
        }
    }

    downloadFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast(`Downloading "${file.name}"`, 'info');
    }

    previewFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const modal = document.getElementById('previewModal');
        const title = document.getElementById('previewTitle');
        const content = document.getElementById('previewContent');

        title.textContent = file.name;
        
        if (file.type.startsWith('image/')) {
            content.innerHTML = `<img src="${file.data}" alt="${file.name}" class="preview-content">`;
        } else if (file.type === 'application/pdf') {
            content.innerHTML = `<iframe src="${file.data}" class="preview-content"></iframe>`;
        } else if (file.type === 'text/plain') {
            const text = atob(file.data.split(',')[1]);
            content.innerHTML = `<pre class="whitespace-pre-wrap text-sm">${text}</pre>`;
        } else {
            content.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-file-alt text-6xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600 mb-4">Preview not available for this file type</p>
                    <button onclick="fileHub.downloadFile(${file.id})" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-download mr-2"></i>Download File
                    </button>
                </div>
            `;
        }

        modal.classList.remove('hidden');
        modal.classList.add('show');
    }

    closePreview() {
        const modal = document.getElementById('previewModal');
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }

    getFileIcon(type) {
        if (type === 'application/pdf') return 'fa-file-pdf file-icon-pdf';
        if (type.includes('word') || type.includes('document')) return 'fa-file-word file-icon-doc';
        if (type.includes('powerpoint') || type.includes('presentation')) return 'fa-file-powerpoint file-icon-ppt';
        if (type.includes('excel') || type.includes('spreadsheet')) return 'fa-file-excel file-icon-xls';
        if (type.startsWith('image/')) return 'fa-file-image file-icon-image';
        return 'fa-file file-icon-other';
    }

    getFileType(type) {
        if (type === 'application/pdf') return 'pdf';
        if (type.includes('word') || type.includes('document')) return 'doc';
        if (type.includes('powerpoint') || type.includes('presentation')) return 'ppt';
        if (type.includes('excel') || type.includes('spreadsheet')) return 'xls';
        if (type.startsWith('image/')) return 'image';
        return 'other';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getFilteredAndSortedFiles() {
        let filtered = this.files;

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(file => 
                file.name.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply type filter
        if (this.currentFilter) {
            filtered = filtered.filter(file => 
                this.getFileType(file.type) === this.currentFilter
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'newest':
                    return new Date(b.uploadDate) - new Date(a.uploadDate);
                case 'oldest':
                    return new Date(a.uploadDate) - new Date(b.uploadDate);
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return a.size - b.size;
                default:
                    return 0;
            }
        });

        return filtered;
    }

    updateUI() {
        const container = document.getElementById('filesContainer');
        const emptyState = document.getElementById('emptyState');
        const fileCount = document.getElementById('fileCount');
        const clearAllBtn = document.getElementById('clearAll');
        const uploadSection = document.getElementById('uploadSection');
        const publicNotice = document.getElementById('publicNotice');
        const adminBtn = document.getElementById('adminBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        const files = this.getFilteredAndSortedFiles();

        fileCount.textContent = `${this.files.length} file${this.files.length !== 1 ? 's' : ''} uploaded`;
        clearAllBtn.classList.toggle('hidden', this.files.length === 0 || !this.isAdmin);
        
        // Show/hide admin controls
        uploadSection.classList.toggle('hidden', !this.isAdmin);
        publicNotice.classList.toggle('hidden', this.isAdmin);
        adminBtn.classList.toggle('hidden', this.isAdmin);
        logoutBtn.classList.toggle('hidden', !this.isAdmin);

        if (files.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            container.innerHTML = files.map(file => this.createFileCard(file)).join('');
        }
    }

    createFileCard(file) {
        const icon = this.getFileIcon(file.type);
        const size = this.formatFileSize(file.size);
        const date = this.formatDate(file.uploadDate);

        const actionButtons = this.isAdmin ? `
            <button onclick="fileHub.previewFile(${file.id})" 
                    class="flex-1 bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100 transition-colors"
                    title="Preview">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="fileHub.downloadFile(${file.id})" 
                    class="flex-1 bg-green-50 text-green-600 px-2 py-1 rounded text-xs hover:bg-green-100 transition-colors"
                    title="Download">
                <i class="fas fa-download"></i>
            </button>
            <button onclick="fileHub.deleteFile(${file.id})" 
                    class="flex-1 bg-red-50 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-100 transition-colors"
                    title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        ` : `
            <button onclick="fileHub.previewFile(${file.id})" 
                    class="flex-1 bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100 transition-colors"
                    title="Preview">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="fileHub.downloadFile(${file.id})" 
                    class="w-full bg-green-50 text-green-600 px-2 py-1 rounded text-xs hover:bg-green-100 transition-colors"
                    title="Download">
                <i class="fas fa-download"></i>
            </button>
        `;

        return `
            <div class="file-card bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all duration-200">
                <div class="flex flex-col h-full">
                    <div class="flex items-center justify-center mb-3">
                        <i class="fas ${icon} text-4xl"></i>
                    </div>
                    
                    <div class="flex-1">
                        <h3 class="font-medium text-gray-900 text-sm mb-1 truncate" title="${file.name}">
                            ${file.name}
                        </h3>
                        <p class="file-size text-xs text-gray-500 mb-1">${size}</p>
                        <p class="file-date text-xs text-gray-400">${date}</p>
                    </div>
                    
                    <div class="action-buttons flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }

    clearAllFiles() {
        this.files = [];
        this.saveFilesToStorage();
        this.updateUI();
        this.showToast('All files cleared', 'success');
    }

    saveFilesToStorage() {
        try {
            localStorage.setItem('fileShareHubFiles', JSON.stringify(this.files));
        } catch (e) {
            console.error('Failed to save files to storage:', e);
            this.showToast('Storage quota exceeded. Some files may be lost.', 'error');
        }
    }

    loadFilesFromStorage() {
        try {
            const stored = localStorage.getItem('fileShareHubFiles');
            if (stored) {
                this.files = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load files from storage:', e);
            this.files = [];
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    'fa-info-circle';
        
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icon} mr-3 text-lg"></i>
                <span class="flex-1">${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Admin authentication methods
    showLoginModal() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('password').focus();
    }

    hideLoginModal() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('loginForm').reset();
    }

    handleLogin() {
        const password = document.getElementById('password').value;
        
        if (password === this.adminPassword) {
            this.isAdmin = true;
            this.saveAdminStatus();
            this.hideLoginModal();
            this.updateUI();
            this.showToast('Admin login successful', 'success');
        } else {
            this.showToast('Invalid password', 'error');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }

    handleLogout() {
        this.isAdmin = false;
        this.saveAdminStatus();
        this.updateUI();
        this.showToast('Logged out successfully', 'success');
    }

    checkAdminStatus() {
        const savedStatus = localStorage.getItem('fileShareHubAdmin');
        this.isAdmin = savedStatus === 'true';
    }

    saveAdminStatus() {
        localStorage.setItem('fileShareHubAdmin', this.isAdmin.toString());
    }
}

// Initialize the application
const fileHub = new FileShareHub();

// Make it globally available for inline event handlers
window.fileHub = fileHub;