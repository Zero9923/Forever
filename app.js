// 封装的本地存储防崩溃函数
const safeStorage = {
    data: {},
    set(key, val) { 
        try { 
            localStorage.setItem(key, val); 
        } catch(e) { 
            console.warn("存储超限，启用临时内存", e);
            this.data[key] = val; 
        } 
    },
    get(key) { 
        try { 
            return localStorage.getItem(key) || this.data[key]; 
        } catch(e) { 
            return this.data[key]; 
        } 
    }
};

const app = Vue.createApp({
    data() {
        return {
            // UI 状态控制
            styles: {
                gateway: { opacity: 1, transform: 'scale(1)', pointerEvents: 'auto' },
                transition: { opacity: 0, pointerEvents: 'none' },
                hub: { opacity: 0, transform: 'scale(0.96)', zIndex: 5 },
                chat: { opacity: 0, transform: 'scale(1.02)', pointerEvents: 'none' },
                scanLineHeight: '0px',
                syncTextOpacity: 0,
                syncText: 'DECRYPTING SIGNAL...',
                igCard: { opacity: 0, transform: 'translateY(20px)' },
                navItemOpacity: 0,
                navItemTransform: 'translateX(-20px)'
            },
            
            showStickers: false,

            // 全局弹窗控制
            modals: {
                toast: false, 
                alert: false, 
                confirm: false, 
                upload: false, 
                wallpaper: false,
                settings: false, 
                prompt: false, 
                presetList: false, 
                modelList: false,
                file: false, 
                fileEdit: false
            },
            
            toastText: '',
            alertText: '',
            
            confirmTitle: '',
            confirmText: '',
            confirmAction: null, 

            uploadTitle: '设定影像',
            currentUploadTarget: '',

            apiForm: { url: '', key: '', model: '', temp: '0.8' },
            tempInputName: '', 
            tempUploadUrl: '', 
            fetchedModels: [],
            presets: [],

            images: {
                wallpaper: '',
                igCore: '',
                polaroid: '',
                circle: '',
                film: ''
            },

            pressTimer: null,
            fetchStatus: '拉取模型',

            // 悬浮球系统状态
            fabActive: false,
            fabPos: { x: 0, y: 0 },
            fabDragging: false,
            fabStart: { x: 0, y: 0 },
            fabBase: { x: 0, y: 0 },

            // File 档案库数据结构
            fileTab: 'char', 
            files: { chars: [], users: [] },
            editingFile: { id: '', name: '', desc: '', avatar: '', boundUserId: null }, 
            
            customSelectOpen: false,

            // Chat 聊天终端核心状态
            chatTab: 'message', 
            moments: [
                {
                    id: 1,
                    author: 'SYSTEM_ADMIN',
                    avatar: '',
                    time: 'Just now',
                    text: '系统终端频道已构建完毕。随时可以开始神经链接...',
                    img: ''
                }
            ]
        }
    },
    mounted() {
        // 🚀 核心修复：加载数据时，明确、强制读取
        this.loadPresets();
        this.loadFiles();
        this.loadImages();
        
        this.apiForm.url = safeStorage.get('active_url') || '';
        this.apiForm.key = safeStorage.get('active_key') || '';
        this.apiForm.model = safeStorage.get('active_model') || '';
        this.apiForm.temp = safeStorage.get('active_temp') || '0.8';

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select-wrapper')) {
                this.customSelectOpen = false;
            }
        });
    },
    methods: {
        // ==========================================
        // 🌟 终极修复：本地影像压缩引擎 🌟
        // ==========================================
        compressImage(file, callback) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 800; // 强制压到800像素以内，极度省内存
                    
                    if (width > height) {
                        if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                    } else {
                        if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    callback(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        // --- 核心工具 ---
        showToast(msg) { this.toastText = msg; this.modals.toast = true; setTimeout(() => { this.modals.toast = false; }, 2000); },
        showAlert(msg) { this.alertText = msg; this.modals.alert = true; },
        closeModal(modalName) { this.modals[modalName] = false; },

        showConfirm(title, text, actionFn) {
            this.confirmTitle = title;
            this.confirmText = text;
            this.confirmAction = actionFn;
            this.modals.confirm = true;
        },
        executeConfirm() {
            if (this.confirmAction) this.confirmAction();
            this.modals.confirm = false;
        },

        // --- 过场动画系统 ---
        startSyncSequence() {
            this.styles.gateway = { opacity: 0, transform: 'scale(1.05)', pointerEvents: 'none' };
            setTimeout(() => {
                this.styles.transition.opacity = 1;
                setTimeout(() => { this.styles.scanLineHeight = '150px'; this.styles.syncTextOpacity = 1; }, 300);
            }, 500);
            setTimeout(() => {
                this.styles.syncText = "ACCESS GRANTED.";
                setTimeout(() => {
                    this.styles.transition.opacity = 0;
                    this.styles.hub = { opacity: 1, transform: 'scale(1)', zIndex: 50 };
                    setTimeout(() => {
                        this.styles.igCard = { opacity: 1, transform: 'translateY(0)' };
                        this.styles.navItemOpacity = 1;
                        this.styles.navItemTransform = 'translateX(0)';
                        this.showStickers = true;
                    }, 200);
                }, 500);
            }, 1800);
        },
        returnToGateway() {
            this.styles.hub = { opacity: 0, transform: 'scale(0.96)', zIndex: 5 };
            this.styles.igCard = { opacity: 0, transform: 'translateY(20px)' };
            this.styles.navItemOpacity = 0;
            this.styles.navItemTransform = 'translateX(-20px)';
            this.showStickers = false;
            setTimeout(() => {
                this.styles.gateway = { opacity: 1, transform: 'scale(1)', pointerEvents: 'auto' };
                this.styles.scanLineHeight = '0px';
                this.styles.syncTextOpacity = 0;
                this.styles.syncText = "DECRYPTING SIGNAL...";
            }, 600);
        },

        // --- 图片存储引擎 (强制写入) ---
        loadImages() {
            this.images.wallpaper = safeStorage.get('img_wallpaper') || '';
            this.images.igCore = safeStorage.get('img_igCore') || '';
            this.images.polaroid = safeStorage.get('img_polaroid') || '';
            this.images.circle = safeStorage.get('img_circle') || '';
            this.images.film = safeStorage.get('img_film') || '';
        },
        saveImages() {
            for(let key in this.images) { 
                safeStorage.set('img_' + key, this.images[key]); 
            }
        },

        // --- 长按换壁纸 ---
        startPress(e) {
            if(e.target.closest('.hub-main-bottom') || e.target.closest('.sticker') || e.target.closest('.fab-wrapper')) return;
            this.pressTimer = setTimeout(() => { this.tempUploadUrl = ''; this.modals.wallpaper = true; }, 800);
        },
        cancelPress() { clearTimeout(this.pressTimer); },
        
        applyWallpaper(isUrl, e = null) {
            if (isUrl) {
                if (!this.tempUploadUrl) return this.showToast("请输入有效地址！");
                this.images.wallpaper = this.tempUploadUrl;
                this.saveImages();
                this.closeModal('wallpaper');
                this.showToast("背景壁纸已更新");
            } else {
                const file = e.target.files[0];
                if (!file) return;
                this.compressImage(file, (compressedSrc) => {
                    this.images.wallpaper = compressedSrc;
                    this.saveImages();
                    this.closeModal('wallpaper');
                    this.showToast("背景壁纸已更新");
                });
            }
        },
        clearWallpaper() {
            this.images.wallpaper = '';
            this.saveImages();
            this.closeModal('wallpaper');
            this.showToast("壁纸已恢复默认");
        },

        // --- 万能图片上传 ---
        openUpload(target, title) {
            this.currentUploadTarget = target;
            this.uploadTitle = title;
            this.tempUploadUrl = '';
            this.modals.upload = true;
        },
        applyImage(isUrl, e = null) {
            const setTargetData = (src) => {
                if (this.currentUploadTarget === 'fileAvatar') {
                    this.editingFile.avatar = src; 
                } else {
                    this.images[this.currentUploadTarget] = src; 
                    this.saveImages();
                }
                this.closeModal('upload');
                this.showToast("影像已更新");
            };

            if (isUrl) {
                if (!this.tempUploadUrl) return this.showToast("请输入有效地址！");
                setTargetData(this.tempUploadUrl);
            } else {
                const file = e.target.files[0];
                if (!file) return;
                this.compressImage(file, (compressedSrc) => {
                    setTargetData(compressedSrc);
                });
            }
        },
        clearUploadImage() {
            if (this.currentUploadTarget === 'fileAvatar') {
                this.editingFile.avatar = ''; 
            } else {
                this.images[this.currentUploadTarget] = ''; 
                this.saveImages();
            }
            this.closeModal('upload');
            this.showToast("影像已清空");
        },

        // --- API 底层逻辑 ---
        saveActiveConfig() {
            safeStorage.set('active_url', this.apiForm.url);
            safeStorage.set('active_key', this.apiForm.key);
            safeStorage.set('active_model', this.apiForm.model);
            safeStorage.set('active_temp', this.apiForm.temp);
            this.showToast("配置已应用！");
            setTimeout(() => { this.closeModal('settings'); }, 500);
        },
        loadPresets() { this.presets = JSON.parse(safeStorage.get('chat_presets') || '[]'); },
        saveNewPreset() {
            if (!this.tempInputName) return this.showToast("名字不能为空！");
            this.presets.push({ id: Date.now().toString(), name: this.tempInputName, url: this.apiForm.url, key: this.apiForm.key, model: this.apiForm.model, temp: this.apiForm.temp });
            safeStorage.set('chat_presets', JSON.stringify(this.presets));
            this.closeModal('prompt'); this.showToast(`保存成功：${this.tempInputName}`);
        },
        applyPreset(p) { this.apiForm.url = p.url; this.apiForm.key = p.key; this.apiForm.model = p.model; this.apiForm.temp = p.temp; this.closeModal('presetList'); this.showToast(`已切换预设：${p.name}`); },
        deletePreset(id) { this.presets = this.presets.filter(p => p.id !== id); safeStorage.set('chat_presets', JSON.stringify(this.presets)); this.showToast("预设已删除"); },
        async fetchModels() {
            let url = this.apiForm.url.trim(); const key = this.apiForm.key.trim();
            if (!url || !key) return this.showAlert("请填写 API 地址和 Key！");
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (url.endsWith('/chat/completions')) url = url.replace('/chat/completions', '');
            this.fetchStatus = "拉取中...";
            try {
                const response = await fetch(`${url}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } });
                if (!response.ok) throw new Error(`状态码: ${response.status}`);
                const data = await response.json();
                if (data && data.data && Array.isArray(data.data)) {
                    this.fetchedModels = data.data.map(m => m.id);
                    this.showToast(`成功拉取 ${this.fetchedModels.length} 个模型`);
                    setTimeout(() => { this.modals.modelList = true; }, 500);
                } else { throw new Error("数据格式错误"); }
            } catch (error) {
                if (error.message.includes('Failed to fetch')) { this.showAlert("<b>跨域拦截！</b><br><small>禁止浏览器跨域拉取，请手动打字输入。</small>"); } 
                else { this.showAlert(`<b>拉取失败：</b><br>${error.message}`); }
            } finally { this.fetchStatus = "重新拉取"; }
        },
        selectModel(modelName) { this.apiForm.model = modelName; this.closeModal('modelList'); this.showToast("已选择模型"); },

        // --- 悬浮球自由拖拽逻辑 ---
        onFabTouchStart(e) { this.fabDragging = false; this.fabStart.x = e.touches[0].clientX; this.fabStart.y = e.touches[0].clientY; },
        onFabTouchMove(e) {
            const dx = e.touches[0].clientX - this.fabStart.x;
            const dy = e.touches[0].clientY - this.fabStart.y;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { this.fabDragging = true; this.fabPos.x = this.fabBase.x + dx; this.fabPos.y = this.fabBase.y + dy; }
        },
        onFabTouchEnd(e) {
            if (!this.fabDragging) { this.fabActive = !this.fabActive; } 
            else { this.fabBase.x = this.fabPos.x; this.fabBase.y = this.fabPos.y; this.fabDragging = false; }
        },

        // ==========================================
        // 🌟 导出 / 导入 / 粉碎 数据 🌟
        // ==========================================
        exportData() {
            let exportObj = {}; 
            for (let i = 0; i < localStorage.length; i++) { 
                let key = localStorage.key(i); 
                exportObj[key] = localStorage.getItem(key); 
            }
            const dataUri = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
            const anchor = document.createElement('a'); 
            anchor.setAttribute("href", dataUri); 
            anchor.setAttribute("download", "Forever_Backup_Data.json"); 
            document.body.appendChild(anchor); 
            anchor.click(); 
            anchor.remove();
            this.fabActive = false; 
            this.showToast("备份已下载");
        },
        
        // 🌟 新增：触发导入选择框
        triggerImport() {
            document.getElementById('importInput').click();
            this.fabActive = false;
        },

        // 🌟 新增：解析 JSON 并恢复数据
        importData(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    // 弹窗确认覆盖
                    this.showConfirm(
                        "恢复数据存档", 
                        "导入备份将覆盖并替换当前设备上的所有数据！是否继续？", 
                        () => {
                            localStorage.clear(); // 拔草除根，清掉旧数据
                            for (let key in importedData) {
                                localStorage.setItem(key, importedData[key]);
                            }
                            this.showToast("存档导入成功！正在重载...");
                            setTimeout(() => { location.reload(); }, 800); // 强力刷新页面应用存档
                        }
                    );
                } catch (err) {
                    this.showAlert("解析存档失败！<br><small>请确保上传的是之前导出的 JSON 备份文件。</small>");
                }
            };
            reader.readAsText(file);
            e.target.value = ''; // 清空 input，允许后续重复传同一个文件
        },

        clearData() {
            this.showConfirm("数据粉碎确认", "此操作将清除所有贴纸、设置与档案记录，且永久不可恢复。是否继续？", () => { localStorage.clear(); location.reload(); });
        },

        // --- File 档案库系统逻辑 (强制存盘修复) ---
        loadFiles() {
            this.files.chars = JSON.parse(safeStorage.get('file_chars') || '[]');
            this.files.users = JSON.parse(safeStorage.get('file_users') || '[]');
        },
        saveFiles() {
            safeStorage.set('file_chars', JSON.stringify(this.files.chars));
            safeStorage.set('file_users', JSON.stringify(this.files.users));
        },
        openFileModal() { this.modals.file = true; },
        switchFileTab(tab) { this.fileTab = tab; },
        createNewFile() { this.editingFile = { id: Date.now().toString(), name: '', desc: '', avatar: '', boundUserId: null }; this.modals.fileEdit = true; },
        editFile(item) { this.editingFile = JSON.parse(JSON.stringify(item)); this.modals.fileEdit = true; },
        saveEditingFile() {
            if (!this.editingFile.name.trim()) return this.showToast("必须填写名称！");
            const list = this.fileTab === 'char' ? this.files.chars : this.files.users;
            const idx = list.findIndex(i => i.id === this.editingFile.id);
            if (idx > -1) { list[idx] = { ...this.editingFile }; } else { list.unshift({ ...this.editingFile }); }
            
            this.saveFiles(); // 🚨 强制锁定硬盘存盘！！
            this.modals.fileEdit = false;
            this.showToast("档案保存成功");
        },
        deleteFile(id) {
            this.showConfirm("删除档案记录", "确认彻底删除此资料吗？", () => {
                const list = this.fileTab === 'char' ? this.files.chars : this.files.users;
                const idx = list.findIndex(i => i.id === id);
                if (idx > -1) list.splice(idx, 1);
                if (this.fileTab === 'user') { this.files.chars.forEach(char => { if (char.boundUserId === id) char.boundUserId = null; }); }
                
                this.saveFiles(); 
                this.showToast("档案已抹除");
            });
        },
        toggleCustomSelect() { this.customSelectOpen = !this.customSelectOpen; },
        selectBoundUser(userId) { this.editingFile.boundUserId = userId; this.customSelectOpen = false; },
        getBoundUserName(userId) { if (!userId) return null; const user = this.files.users.find(u => u.id === userId); return user ? user.name : '未知面具(已被删)'; },

        // --- Chat 模块核心引擎 ---
        openChat() {
            this.styles.hub = { opacity: 0, transform: 'scale(0.96)', zIndex: 5 };
            setTimeout(() => { this.styles.chat = { opacity: 1, transform: 'scale(1)', pointerEvents: 'auto' }; }, 300);
        },
        closeChat() {
            this.styles.chat = { opacity: 0, transform: 'scale(1.02)', pointerEvents: 'none' };
            setTimeout(() => { this.styles.hub = { opacity: 1, transform: 'scale(1)', zIndex: 50 }; }, 300);
        },
        switchChatTab(tab) { this.chatTab = tab; },
        enterChatRoom(charData) {
            this.showAlert(`你点击了 [${charData.name}]，<br><small>独立的聊天窗口逻辑将在下一步构建！</small>`);
        }
    }
});

app.mount('#app');

