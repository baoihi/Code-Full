// ==UserScript==
// @name         Control Panel - Auto Clicker & Music & SpeedHack
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Menu điều khiển với Auto Clicker, Music và SpeedHack (VIP cần key)
// @author       YourName
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_addStyle
// @connect      gist.githubusercontent.com
// @run-at       document-end
// @downloadURL https://update.greasyfork.org/scripts/576174/Control%20Panel%20-%20Auto%20Clicker%20%20Music%20%20SpeedHack.user.js
// @updateURL https://update.greasyfork.org/scripts/576174/Control%20Panel%20-%20Auto%20Clicker%20%20Music%20%20SpeedHack.meta.js
// ==/UserScript==

(function() {
    'use strict';
    
    // ========== THAY THẾ GM_* BẰNG localStorage ==========
    function setStorage(key, value) {
        try { localStorage.setItem('cp_' + key, JSON.stringify(value)); } catch(e) {}
    }
    function getStorage(key, defaultValue) {
        try { const val = localStorage.getItem('cp_' + key); return val ? JSON.parse(val) : defaultValue; } catch(e) { return defaultValue; }
    }
    
    // ========== CẤU HÌNH VIP ==========
    const VIP_CONFIG = {
        GIST_URL: 'https://gist.githubusercontent.com/hoangdlong180-code/ba5f2bb9b3f566e9b4f90d41eb6a945f/raw/1bbb8856e06c8eeae8a88821f1f32e7151436798/keys.json',
        ADMIN_PASSWORD: 'ADMIN2026'
    };
    
    let dailyKeys = {};
    let isVIPActive = false;
    let vipModalVisible = false;
    
    // ========== BIẾN ĐĂNG NHẬP ==========
    let isLoggedIn = false;
    let currentUsername = '';
    
    // ========== QUẢN LÝ KEY VIP ==========
    function getTodayString() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    
    function getTodayKey() {
        return dailyKeys[getTodayString()] || null;
    }
    
    function loadKeys() {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: VIP_CONFIG.GIST_URL,
                headers: { 'Cache-Control': 'no-cache' },
                onload: function(r) {
                    try {
                        if (r.status === 200) {
                            dailyKeys = JSON.parse(r.responseText);
                            setStorage('keyCache', r.responseText);
                        } else {
                            // Nếu status không phải 200, dùng cache
                            const cache = getStorage('keyCache', '{}');
                            dailyKeys = JSON.parse(cache);
                        }
                    } catch(e) {
                        // Nếu parse lỗi, dùng cache
                        const cache = getStorage('keyCache', '{}');
                        dailyKeys = JSON.parse(cache);
                    }
                    resolve(dailyKeys);
                },
                onerror: function() {
                    // Nếu lỗi mạng, dùng cache
                    const cache = getStorage('keyCache', '{}');
                    dailyKeys = JSON.parse(cache);
                    resolve(dailyKeys);
                }
            });
        });
    }
    
    // ========== MODAL ĐĂNG NHẬP ==========
    function showLoginModal(callback) {
        if (vipModalVisible) return;
        vipModalVisible = true;
        
        const overlay = document.createElement('div');
        overlay.id = 'login-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 9999999;
            display: flex; justify-content: center; align-items: center;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #667eea;
                border-radius: 16px;
                padding: 25px;
                width: 380px;
                color: white;
                font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center;
            ">
                <div style="font-size: 50px; margin-bottom: 10px;">🎮</div>
                <h2 style="color: #667eea; margin: 0 0 8px 0;">ĐĂNG NHẬP</h2>
                <p style="color: #ccc; font-size: 13px; margin-bottom: 20px;">
                    Vui lòng đăng nhập để sử dụng Control Panel
                </p>
                <input type="text" id="login-username" placeholder="Tên đăng nhập..." 
                    style="width: 100%; padding: 12px; border: 2px solid #444; border-radius: 10px;
                    background: rgba(255,255,255,0.05); color: white; font-size: 14px;
                    box-sizing: border-box; outline: none; margin-bottom: 12px;"
                    autocomplete="off">
                <input type="password" id="login-password" placeholder="Mật khẩu..." 
                    style="width: 100%; padding: 12px; border: 2px solid #444; border-radius: 10px;
                    background: rgba(255,255,255,0.05); color: white; font-size: 14px;
                    box-sizing: border-box; outline: none; margin-bottom: 10px;"
                    autocomplete="off">
                <div id="login-error" style="color: #ff6b6b; font-size: 12px; min-height: 18px; margin-bottom: 15px;"></div>
                <div style="display: flex; gap: 10px;">
                    <button id="login-confirm-btn" style="
                        flex: 1; padding: 12px; border: none; border-radius: 10px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white; font-weight: bold; font-size: 15px; cursor: pointer;
                    ">✅ Đăng Nhập</button>
                    <button id="login-cancel-btn" style="
                        flex: 1; padding: 12px; border: 1px solid #555; border-radius: 10px;
                        background: transparent; color: #aaa; font-size: 15px; cursor: pointer;
                    ">😅 Bỏ Qua</button>
                </div>
                <div style="margin-top: 12px; font-size: 11px; color: #888;">
                    💡 Nhập username và password bất kỳ đều được
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const usernameInput = overlay.querySelector('#login-username');
        const passwordInput = overlay.querySelector('#login-password');
        const errorDiv = overlay.querySelector('#login-error');
        
        overlay.querySelector('#login-confirm-btn').onclick = () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                errorDiv.textContent = '⚠️ Vui lòng nhập đầy đủ!';
                return;
            }
            
            // NHẬP GÌ CŨNG ĐƯỢC - thành công
            currentUsername = username;
            isLoggedIn = true;
            setStorage('isLoggedIn', 'true');
            setStorage('gameUsername', username);
            overlay.remove();
            vipModalVisible = false;
            
            // Cập nhật giao diện menu
            updateMenuAfterLogin();
            
            if (callback) callback(true);
            
            if (typeof GM_notification === 'function') {
                GM_notification({ text: `👋 Chào mừng ${username}!`, title: 'Đăng nhập thành công', timeout: 2000 });
            } else {
                console.log(`👋 Chào mừng ${username}!`);
            }
        };
        
        overlay.querySelector('#login-cancel-btn').onclick = () => {
            overlay.remove();
            vipModalVisible = false;
            if (callback) callback(false);
        };
        
        const handleEnter = (e) => {
            if (e.key === 'Enter') overlay.querySelector('#login-confirm-btn').click();
        };
        usernameInput.addEventListener('keypress', handleEnter);
        passwordInput.addEventListener('keypress', handleEnter);
        
        setTimeout(() => usernameInput.focus(), 200);
    }
    
    // ========== CẬP NHẬT MENU SAU KHI ĐĂNG NHẬP ==========
    function updateMenuAfterLogin() {
        const panel = document.querySelector('.main-menu-panel');
        if (!panel) return;
        
        const content = panel.querySelector('.main-menu-content');
        if (!content) return;
        
        const username = getStorage('gameUsername', currentUsername);
        const vipStatus = isVIPActive ? 'VIP' : 'Guest';
        const statusBadge = isVIPActive ? 
            '<span class="vip-badge active-vip" style="margin-left:8px;">VIP</span>' : 
            '<span class="vip-badge" style="background:#555;">Guest</span>';
        
        content.innerHTML = `
            <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:10px; margin-bottom:10px; text-align:center; border:1px solid #667eea;">
                👤 Tài khoản: <span style="color:#667eea; font-weight:bold;">${username}</span> ${statusBadge}
            </div>
            <div class="menu-item" id="autoClickerItem">
                <div class="menu-item-left">
                    <span class="menu-item-title">🎯 Auto Clicker</span>
                    <span class="menu-item-desc">Auto click theo tọa độ</span>
                </div>
                <div class="arrow-icon" id="autoClickerArrow">▶</div>
            </div>
            <div id="autoClickerSubmenu" class="submenu-container"></div>
            
            <div class="menu-item" id="speedHackItem">
                <div class="menu-item-left">
                    <span class="menu-item-title">⚡ SpeedHack</span>
                    <span class="menu-item-desc">Tăng tốc game</span>
                </div>
                <div class="arrow-icon" id="speedHackArrow">▶</div>
            </div>
            <div id="speedHackSubmenu" class="submenu-container"></div>
            
            <div class="menu-item" id="musicItem">
                <div class="menu-item-left">
                    <span class="menu-item-title">🎵 Music</span>
                    <span class="menu-item-desc">Nghe nhạc & tắt âm game</span>
                </div>
                <div class="arrow-icon" id="musicArrow">▶</div>
            </div>
            <div id="musicSubmenu" class="submenu-container"></div>
            
            <div class="menu-item" id="vipItem">
                <div class="menu-item-left">
                    <span class="menu-item-title">👑 VIP <span class="vip-badge">VIP</span></span>
                    <span class="menu-item-desc">Tính năng đặc biệt (cần key)</span>
                </div>
                <div class="arrow-icon" id="vipArrow">▶</div>
            </div>
            <div id="vipSubmenu" class="submenu-container"></div>
            
            <div class="menu-item" id="logoutItem" style="border: 1px solid #ff4757; margin-top: 15px;">
                <div class="menu-item-left">
                    <span class="menu-item-title" style="color: #ff4757;">🚪 Đăng xuất</span>
                    <span class="menu-item-desc">Đăng xuất khỏi tài khoản</span>
                </div>
            </div>
        `;
        
        // Cập nhật title
        const titleSpan = panel.querySelector('.main-menu-title');
        if (titleSpan && isVIPActive) {
            titleSpan.innerHTML = `Control Panel <span class="vip-badge active-vip" style="margin-left:8px;">VIP</span>`;
        } else if (titleSpan) {
            titleSpan.innerHTML = `Control Panel`;
        }
        
        // Khởi tạo lại submenu
        let autoClickerExpanded = false;
        let speedHackExpanded = false;
        let musicExpanded = false;
        let vipExpanded = false;
        
        function setupSubmenu(itemId, arrowId, submenuId, createFn, expandedFlag) {
            const item = document.getElementById(itemId);
            const arrow = document.getElementById(arrowId);
            const submenu = document.getElementById(submenuId);
            if (item) {
                item.onclick = (e) => {
                    e.stopPropagation();
                    if (expandedFlag) {
                        arrow.classList.remove('expanded');
                        submenu.classList.remove('show');
                        expandedFlag = false;
                    } else {
                        arrow.classList.add('expanded');
                        submenu.classList.add('show');
                        createFn();
                        expandedFlag = true;
                    }
                };
            }
        }
        
        setupSubmenu('autoClickerItem', 'autoClickerArrow', 'autoClickerSubmenu', createAutoClickerSubmenu, autoClickerExpanded);
        setupSubmenu('speedHackItem', 'speedHackArrow', 'speedHackSubmenu', createSpeedHackSubmenu, speedHackExpanded);
        setupSubmenu('musicItem', 'musicArrow', 'musicSubmenu', createMusicSubmenu, musicExpanded);
        
        const vipItem = document.getElementById('vipItem');
        const vipArrow = document.getElementById('vipArrow');
        const vipSubmenu = document.getElementById('vipSubmenu');
        if (vipItem) {
            vipItem.onclick = (e) => {
                e.stopPropagation();
                if (vipExpanded) {
                    vipArrow.classList.remove('expanded');
                    vipSubmenu.classList.remove('show');
                    vipExpanded = false;
                } else {
                    vipArrow.classList.add('expanded');
                    vipSubmenu.classList.add('show');
                    createVipSubmenu();
                    vipExpanded = true;
                }
            };
        }
        
        // Xử lý đăng xuất
        const logoutItem = document.getElementById('logoutItem');
        if (logoutItem) {
            logoutItem.onclick = () => {
                isLoggedIn = false;
                isVIPActive = false;
                currentUsername = '';
                setStorage('isLoggedIn', 'false');
                setStorage('gameUsername', '');
                setStorage('userKey', '');
                setStorage('keyDate', '');
                location.reload();
            };
        }
    }
    
    // ========== MODAL NHẬP KEY VIP ==========
    function showVIPModal(callback) {
        if (vipModalVisible) return;
        vipModalVisible = true;
        
        const savedKey = getStorage('userKey', '');
        const savedDate = getStorage('keyDate', '');
        const todayStr = getTodayString();
        const todayKey = getTodayKey();
        
        if (savedKey && savedDate === todayStr && savedKey === todayKey) {
            isVIPActive = true;
            vipModalVisible = false;
            if (callback) callback(true);
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'vip-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 9999999;
            display: flex; justify-content: center; align-items: center;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #ffd700;
                border-radius: 16px;
                padding: 25px;
                width: 380px;
                color: white;
                font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center;
            ">
                <div style="font-size: 50px; margin-bottom: 10px;">👑</div>
                <h2 style="color: #ffd700; margin: 0 0 8px 0;">Tính Năng VIP</h2>
                <p style="color: #ccc; font-size: 13px; margin-bottom: 20px;">
                    Vui lòng nhập key VIP để sử dụng tính năng này
                </p>
                <input type="text" id="vip-key-input" placeholder="Nhập key VIP..." 
                    style="width: 100%; padding: 12px; border: 2px solid #444; border-radius: 10px;
                    background: rgba(255,255,255,0.05); color: white; font-size: 15px;
                    text-align: center; box-sizing: border-box; outline: none; margin-bottom: 10px;"
                    autocomplete="off">
                <div id="vip-error" style="color: #ff6b6b; font-size: 12px; min-height: 18px; margin-bottom: 15px;"></div>
                <div style="display: flex; gap: 10px;">
                    <button id="vip-confirm-btn" style="
                        flex: 1; padding: 12px; border: none; border-radius: 10px;
                        background: linear-gradient(135deg, #ffd700, #ff8c00);
                        color: #000; font-weight: bold; font-size: 15px; cursor: pointer;
                    ">✅ Xác Nhận</button>
                    <button id="vip-cancel-btn" style="
                        flex: 1; padding: 12px; border: 1px solid #555; border-radius: 10px;
                        background: transparent; color: #aaa; font-size: 15px; cursor: pointer;
                    ">😅 Bố Chịu</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const input = overlay.querySelector('#vip-key-input');
        const errorDiv = overlay.querySelector('#vip-error');
        
        overlay.querySelector('#vip-confirm-btn').onclick = () => {
            const key = input.value.trim();
            if (!key) {
                errorDiv.textContent = '⚠️ Vui lòng nhập key!';
                return;
            }
            
            const todayKey = getTodayKey();
            if (!todayKey) {
                errorDiv.textContent = '❌ Chưa có key hôm nay. Liên hệ admin!';
                return;
            }
            
            if (key === todayKey) {
                setStorage('userKey', key);
                setStorage('keyDate', getTodayString());
                isVIPActive = true;
                overlay.remove();
                vipModalVisible = false;
                if (callback) callback(true);
                
                if (typeof GM_notification === 'function') {
                    GM_notification({ text: '👑 VIP đã kích hoạt!', title: 'Thành công', timeout: 3000 });
                }
                updateMenuAfterLogin();
            } else {
                errorDiv.textContent = '❌ Key không đúng! Thử lại đi.';
                input.value = '';
                input.focus();
            }
        };
        
        overlay.querySelector('#vip-cancel-btn').onclick = () => {
            overlay.remove();
            vipModalVisible = false;
            if (callback) callback(false);
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') overlay.querySelector('#vip-confirm-btn').click();
        });
        
        setTimeout(() => input.focus(), 200);
    }
    
    function requireVIP(callback) {
        if (isVIPActive) {
            callback();
        } else {
            showVIPModal((success) => {
                if (success) callback();
            });
        }
    }
    
    // ========== KIỂM TRA NẾU ĐÃ CHẠY RỒI THÌ THOÁT ==========
    if (window.hasMyMenuLoaded) return;
    window.hasMyMenuLoaded = true;
    
    // Xóa menu cũ nếu có
    document.querySelectorAll(
        '.main-menu-fab, .main-menu-panel, ' +
        '#auto-clicker-panel, .autoClick-fab, .autoClick-panel, .autoClick-menu, ' +
        '#music-round-btn, #music-panel, ' +
        '.uac-gui-container, .uac-floating-btn, ' +
        '#speedhack-ui, #speedhack-toggle-btn, ' +
        '#floatingNotification, #vip-modal-overlay, #login-modal-overlay'
    ).forEach(el => {
        if (el && el.parentNode) el.remove();
    });
    
    // CSS
    function addStyle(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }
    
    addStyle(`
        .main-menu-fab {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 55px;
            height: 55px;
            border-radius: 50%;
            background: #00adb5;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 999999;
            cursor: grab;
            overflow: hidden;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: none;
            user-select: none;
        }
        .main-menu-fab:active { cursor: grabbing; }
        .main-menu-fab img {
            width: 100%; height: 100%; border-radius: 50%;
            object-fit: cover; pointer-events: none;
        }
        .main-menu-panel {
            position: fixed;
            bottom: 150px;
            right: 20px;
            width: 320px;
            max-height: 80vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            border: 1px solid #667eea;
            color: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            z-index: 999998;
            box-shadow: 0 8px 25px rgba(0,0,0,0.5);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            touch-action: pan-y pinch-zoom;
        }
        .main-menu-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px;
            max-height: calc(80vh - 50px);
            touch-action: pan-y pinch-zoom;
        }
        .main-menu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            background: rgba(102,126,234,0.2);
            border-bottom: 1px solid #667eea;
            cursor: grab;
            user-select: none;
            touch-action: none;
            flex-shrink: 0;
        }
        .main-menu-header:active { cursor: grabbing; }
        .main-menu-title { font-weight: bold; color: #667eea; font-size: 14px; pointer-events: none; }
        .main-menu-close {
            background: #ff4757;
            border: none;
            color: white;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            transition: 0.2s;
        }
        .main-menu-close:hover { background: #ff6b81; }
        .menu-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin: 8px 0;
            background: #0f0f1a;
            border-radius: 10px;
            cursor: pointer;
            transition: 0.2s;
        }
        .menu-item:hover { background: #1a1a2e; }
        .menu-item-left { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .menu-item-title { font-weight: bold; font-size: 14px; }
        .menu-item-desc { font-size: 11px; color: #aaa; }
        .arrow-icon {
            font-size: 18px;
            transition: transform 0.3s ease;
            color: #667eea;
        }
        .arrow-icon.expanded { transform: rotate(90deg); }
        .toggle-switch {
            position: relative;
            width: 50px;
            height: 24px;
            background-color: #2d2d44;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .toggle-switch.active { background-color: #00adb5; }
        .toggle-slider {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background-color: white;
            border-radius: 50%;
            transition: all 0.3s;
        }
        .toggle-switch.active .toggle-slider { left: 28px; }
        .submenu-container {
            margin-left: 15px;
            overflow: hidden;
            transition: max-height 0.3s ease;
            max-height: 0;
        }
        .submenu-container.show { max-height: 500px; }
        .submenu-item {
            padding: 10px;
            background: #0a0a14;
            border-radius: 8px;
            margin-top: 8px;
        }
        .submenu-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .music-controls {
            margin-top: 5px;
            display: flex;
            gap: 10px;
        }
        .music-btn {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            transition: 0.2s;
        }
        .play-music-btn {
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
        }
        .play-music-btn:hover { opacity: 0.9; transform: scale(1.02); }
        .stop-music-btn {
            background: linear-gradient(135deg, #ff9800, #ff5722);
            color: white;
        }
        .stop-music-btn:hover { opacity: 0.9; transform: scale(1.02); }
        .music-status { font-size: 10px; text-align: center; margin-top: 0px; color: #4caf50; }
        .vip-badge {
            background: linear-gradient(135deg, #ffd700, #ff8c00);
            color: #000;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 8px;
        }
        .vip-badge.active-vip {
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
        }
        .compact-item { margin-bottom: 5px !important; padding: 8px !important; }
        .speed-status, .autoclick-status {
            font-size: 11px;
            color: #4caf50;
            margin-top: 5px;
            text-align: center;
        }
        @media (max-width: 768px) {
            .main-menu-panel { width: 300px; right: 5px; left: auto; max-height: 85vh; }
            .main-menu-fab { bottom: 70px; right: 10px; width: 50px; height: 50px; }
        }
    `);
    
    // ========== BIẾN TOÀN CỤC ==========
    let myAudio = null;
    let isPlaying = false;
    let gameSoundMuted = false;
    let musicFeatureState = { isMuteGame: false };
    let speedHackEnabled = false;
    let speedHackScript = null;
    let autoClickerEnabled = false;
    let autoClickerLoaded = false;
    
    // ========== HÀM TẢI AUTO CLICKER (GIỮ NGUYÊN) ==========
    function loadAutoClicker() {
        return new Promise((resolve, reject) => {
            if (autoClickerLoaded) {
                const existingPanel = document.getElementById('auto-clicker-panel');
                if (existingPanel) existingPanel.style.display = 'block';
                const existingFab = document.querySelector('.autoClick-fab');
                if (existingFab) existingFab.style.display = 'flex';
                resolve();
                return;
            }
            
            const sourceUrl = "https://raw.githubusercontent.com/Minhbeo8/autoclickGUI/refs/heads/main/autoclick.js";
            
            const mockGM = {
                addStyle: function(css) {
                    const style = document.createElement('style');
                    style.textContent = css;
                    document.head.appendChild(style);
                },
                setValue: function(key, value) {
                    try { localStorage.setItem('gm_' + key, JSON.stringify(value)); } catch(e) {}
                },
                getValue: function(key, defaultValue) {
                    try {
                        const val = localStorage.getItem('gm_' + key);
                        return val ? JSON.parse(val) : defaultValue;
                    } catch(e) { return defaultValue; }
                },
                deleteValue: function(key) {
                    try { localStorage.removeItem('gm_' + key); } catch(e) {}
                },
                listValues: function() {
                    const keys = [];
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key.startsWith('gm_')) keys.push(key.substring(3));
                        }
                    } catch(e) {}
                    return keys;
                },
                openInTab: function(url) { window.open(url, '_blank'); }
            };
            
            fetch(sourceUrl + '?t=' + Date.now())
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.text();
                })
                .then(code => {
                    try {
                        const scriptFunc = new Function(
                            'GM_addStyle', 'GM_setValue', 'GM_getValue',
                            'GM_deleteValue', 'GM_listValues', 'GM_openInTab',
                            code
                        );
                        scriptFunc(
                            mockGM.addStyle, mockGM.setValue, mockGM.getValue,
                            mockGM.deleteValue, mockGM.listValues, mockGM.openInTab
                        );
                        autoClickerLoaded = true;
                        resolve();
                    } catch (err) { reject(err); }
                })
                .catch(err => reject(err));
        });
    }
    
    function unloadAutoClicker() {
        document.querySelectorAll(
            '#auto-clicker-panel, .autoClick-fab, .autoClick-panel, ' +
            '.autoClick-menu, .uac-gui-container, .uac-floating-btn, ' +
            '#auto-clicker-overlay, .auto-clicker-settings, .auto-clicker-status'
        ).forEach(el => {
            if (el && el.parentNode) el.remove();
        });
        autoClickerEnabled = false;
        autoClickerLoaded = false;
    }
    
    // ========== HÀM LOAD SPEEDHACK (GIỮ NGUYÊN) ==========
    function loadSpeedHack() {
        return new Promise((resolve, reject) => {
            const scriptUrl = 'https://update.greasyfork.org/scripts/543798/Universal%20HTML5%20Speed%20Hack.user.js';
            
            fetch(scriptUrl)
                .then(response => response.text())
                .then(code => {
                    const script = document.createElement('script');
                    script.textContent = code;
                    script.setAttribute('data-speedhack-loaded', 'true');
                    document.head.appendChild(script);
                    speedHackScript = script;
                    setTimeout(() => resolve(), 500);
                })
                .catch(err => reject(err));
        });
    }
    
    function unloadSpeedHack() {
        if (speedHackScript) { speedHackScript.remove(); speedHackScript = null; }
        document.querySelectorAll('#speedhack-ui, #speedhack-toggle-btn').forEach(el => {
            if (el && el.parentNode) el.remove();
        });
        speedHackEnabled = false;
    }
    
    // ========== CÁC HÀM TẠO SUBMENU (GIỮ NGUYÊN) ==========
    function createSpeedHackSubmenu() {
        const submenuDiv = document.getElementById('speedHackSubmenu');
        if (!submenuDiv) return;
        
        submenuDiv.innerHTML = `
            <div class="submenu-item">
                <div class="submenu-content">
                    <span>⚡ Bật/Tắt SpeedHack</span>
                    <div class="toggle-switch ${speedHackEnabled ? 'active' : ''}" id="toggleSpeedHackInside">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                <div class="speed-status" id="speedHackStatus">
                    ${speedHackEnabled ? '✅ Đã kích hoạt (Nhấn L để mở menu)' : '🔴 Chưa kích hoạt'}
                </div>
                <div style="font-size: 11px; color: #aaa; margin-top: 8px; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                    💡 Sau khi bật, nhấn phím <strong style="color:#4caf50">L</strong> để mở giao diện
                </div>
            </div>
        `;
        
        const toggleBtn = document.getElementById('toggleSpeedHackInside');
        const statusDiv = document.getElementById('speedHackStatus');
        
        if (toggleBtn) {
            toggleBtn.onclick = async (e) => {
                e.stopPropagation();
                speedHackEnabled = !speedHackEnabled;
                
                if (speedHackEnabled) {
                    toggleBtn.classList.add('active');
                    if (statusDiv) statusDiv.innerHTML = '⏳ Đang tải...';
                    try {
                        await loadSpeedHack();
                        if (statusDiv) statusDiv.innerHTML = '✅ Đã kích hoạt (Nhấn L để mở menu)';
                    } catch (err) {
                        speedHackEnabled = false;
                        toggleBtn.classList.remove('active');
                        if (statusDiv) statusDiv.innerHTML = '❌ Tải thất bại';
                    }
                } else {
                    toggleBtn.classList.remove('active');
                    if (statusDiv) statusDiv.innerHTML = '🔴 Chưa kích hoạt';
                    unloadSpeedHack();
                }
            };
        }
    }
    
    function createAutoClickerSubmenu() {
        const submenuDiv = document.getElementById('autoClickerSubmenu');
        if (!submenuDiv) return;
        
        submenuDiv.innerHTML = `
            <div class="submenu-item">
                <div class="submenu-content">
                    <span>🎯 Bật/Tắt Auto Clicker</span>
                    <div class="toggle-switch ${autoClickerEnabled ? 'active' : ''}" id="toggleAutoClickerInside">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                <div class="autoclick-status" id="autoClickerStatus">
                    ${autoClickerEnabled ? '✅ Đã kích hoạt' : '🔴 Chưa kích hoạt'}
                </div>
                <div style="font-size: 11px; color: #aaa; margin-top: 8px; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                    💡 Tự động click theo tọa độ, hỗ trợ anti-detection
                </div>
            </div>
        `;
        
        const toggleBtn = document.getElementById('toggleAutoClickerInside');
        const statusDiv = document.getElementById('autoClickerStatus');
        
        if (toggleBtn) {
            toggleBtn.onclick = async (e) => {
                e.stopPropagation();
                autoClickerEnabled = !autoClickerEnabled;
                
                if (autoClickerEnabled) {
                    toggleBtn.classList.add('active');
                    if (statusDiv) statusDiv.innerHTML = '⏳ Đang tải...';
                    try {
                        await loadAutoClicker();
                        if (statusDiv) statusDiv.innerHTML = '✅ Đã kích hoạt';
                    } catch (err) {
                        autoClickerEnabled = false;
                        toggleBtn.classList.remove('active');
                        if (statusDiv) statusDiv.innerHTML = '❌ Tải thất bại';
                    }
                } else {
                    toggleBtn.classList.remove('active');
                    if (statusDiv) statusDiv.innerHTML = '🔴 Chưa kích hoạt';
                    unloadAutoClicker();
                }
            };
        }
    }
    
    function muteGameSound() {
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
            try {
                var iframeDoc = iframes[i].contentDocument;
                if (iframeDoc) {
                    var iframeMedia = iframeDoc.querySelectorAll('audio, video');
                    for (var j = 0; j < iframeMedia.length; j++) {
                        iframeMedia[j].volume = 0;
                        iframeMedia[j].muted = true;
                    }
                }
            } catch(e) {}
        }
        
        var allMedia = document.querySelectorAll('audio, video');
        for (var i = 0; i < allMedia.length; i++) {
            if (!allMedia[i].isOurMusic) {
                allMedia[i].volume = 0;
                allMedia[i].muted = true;
            }
        }
        
        gameSoundMuted = true;
        const statusSpan = document.getElementById('muteGameStatus');
        if (statusSpan) statusSpan.innerHTML = '✅ Đã tắt';
    }
    
    function unmuteGameSound() {
        var allMedia = document.querySelectorAll('audio, video');
        for (var i = 0; i < allMedia.length; i++) {
            if (!allMedia[i].isOurMusic) {
                allMedia[i].volume = 1;
                allMedia[i].muted = false;
            }
        }
        gameSoundMuted = false;
        const statusSpan = document.getElementById('muteGameStatus');
        if (statusSpan) statusSpan.innerHTML = '🔊 Chưa tắt';
    }
    
    function playMusic() {
        try {
            if (myAudio && isPlaying) return;
            
            if (myAudio && !isPlaying) {
                myAudio.play().then(() => {
                    isPlaying = true;
                    updateMusicStatus();
                }).catch(err => console.error("Lỗi phát nhạc:", err));
            } else {
                myAudio = new Audio();
                myAudio.src = 'https://files.catbox.moe/l2a2j2.mp3';
                myAudio.loop = true;
                myAudio.volume = 0.8;
                myAudio.muted = false;
                myAudio.isOurMusic = true;
                
                myAudio.play().then(() => {
                    isPlaying = true;
                    updateMusicStatus();
                }).catch(err => console.error("Lỗi phát nhạc:", err));
            }
        } catch(e) { console.error(e); }
    }
    
    function stopMusic() {
        if (myAudio) {
            myAudio.pause();
            isPlaying = false;
            updateMusicStatus();
        }
    }
    
    function updateMusicStatus() {
        const statusSpan = document.getElementById('songStatus');
        if (statusSpan) {
            if (isPlaying) {
                statusSpan.innerHTML = '🎵 ĐANG PHÁT';
                statusSpan.style.color = '#4caf50';
            } else {
                statusSpan.innerHTML = '⏸ ĐÃ DỪNG';
                statusSpan.style.color = '#ffeb3b';
            }
        }
    }
    
    function createMusicSubmenu() {
        const submenuDiv = document.getElementById('musicSubmenu');
        if (!submenuDiv) return;
        
        submenuDiv.innerHTML = `
            <div class="submenu-item">
                <div class="submenu-content">
                    <span>🔇 Tắt âm thanh game</span>
                    <div class="toggle-switch ${musicFeatureState.isMuteGame ? 'active' : ''}" id="toggleMuteGame">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                <span id="muteGameStatus" style="font-size: 10px; color: #ffeb3b;">
                    ${gameSoundMuted ? '✅ Đã tắt' : '🔊 Chưa tắt'}
                </span>
            </div>
            <div class="submenu-item compact-item">
                <div style="font-size: 12px; margin-bottom: 8px;">🎵 Sớm như vậy - Bùi Trường Linh</div>
                <div class="music-controls">
                    <button class="music-btn play-music-btn" id="playMusicBtn">▶ PLAY</button>
                    <button class="music-btn stop-music-btn" id="stopMusicBtn">⏹ DỪNG</button>
                </div>
                <div class="music-status">
                    Trạng thái: <span id="songStatus">⏸ Chưa phát</span>
                </div>
            </div>
        `;
        
        const toggleMuteGame = document.getElementById('toggleMuteGame');
        if (toggleMuteGame) {
            toggleMuteGame.onclick = (e) => {
                e.stopPropagation();
                musicFeatureState.isMuteGame = !musicFeatureState.isMuteGame;
                if (musicFeatureState.isMuteGame) {
                    toggleMuteGame.classList.add('active');
                    muteGameSound();
                } else {
                    toggleMuteGame.classList.remove('active');
                    unmuteGameSound();
                }
            };
        }
        
        document.getElementById('playMusicBtn').onclick = (e) => { e.stopPropagation(); playMusic(); };
        document.getElementById('stopMusicBtn').onclick = (e) => { e.stopPropagation(); stopMusic(); };
        
        updateMusicStatus();
    }
    
    function createVipSubmenu() {
        const submenuDiv = document.getElementById('vipSubmenu');
        if (!submenuDiv) return;
        
        const vipBadge = isVIPActive ? '<span class="vip-badge active-vip">ACTIVE</span>' : '<span class="vip-badge">VIP</span>';
        
        submenuDiv.innerHTML = `
            <div class="submenu-item">
                <div class="submenu-content">
                    <span>📋 Log Iframe</span>
                    <div class="toggle-switch" id="toggleLogIframe">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                <div id="logIframeStatus" style="font-size: 11px; color: #aaa; margin-top: 8px; text-align: center;">
                    🔴 Chưa kích hoạt
                </div>
            </div>
            <div class="submenu-item">
                <div class="submenu-content">
                    <span>👤 Log Account ${vipBadge}</span>
                    <div class="toggle-switch" id="toggleLogAccount">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                <div id="logAccountStatus" style="font-size: 11px; color: #aaa; margin-top: 8px; text-align: center;">
                    🔴 Chưa kích hoạt
                </div>
            </div>
            <div class="submenu-item">
                <div class="submenu-content">
                    <span>🔑 Trạng thái VIP</span>
                    <span style="color: ${isVIPActive ? '#4caf50' : '#ff6b6b'}; font-size: 12px;">
                        ${isVIPActive ? '✅ Đã kích hoạt' : '❌ Chưa kích hoạt'}
                    </span>
                </div>
                ${!isVIPActive ? `
                <button id="activeVipNowBtn" style="
                    width: 100%; margin-top: 8px; padding: 8px; border: none;
                    border-radius: 20px; background: linear-gradient(135deg, #ffd700, #ff8c00);
                    color: #000; font-weight: bold; cursor: pointer;
                ">🔑 Kích Hoạt VIP Ngay</button>
                ` : `
                <button id="logoutVipBtn" style="
                    width: 100%; margin-top: 8px; padding: 8px; border: 1px solid #ff4757;
                    border-radius: 20px; background: transparent; color: #ff4757;
                    cursor: pointer;
                ">🚫 Thoát VIP</button>
                `}
            </div>
        `;
        
        const toggleLogIframe = document.getElementById('toggleLogIframe');
        const logIframeStatus = document.getElementById('logIframeStatus');
        
        if (toggleLogIframe) {
            toggleLogIframe.onclick = (e) => {
                e.stopPropagation();
                const isActive = toggleLogIframe.classList.contains('active');
                
                if (isActive) {
                    toggleLogIframe.classList.remove('active');
                    logIframeStatus.innerHTML = '🔴 Chưa kích hoạt';
                } else {
                    toggleLogIframe.classList.add('active');
                    logIframeStatus.innerHTML = '🚧 Đang phát triển';
                    logIframeStatus.style.color = '#ff9800';
                }
            };
        }
        
        const toggleLogAccount = document.getElementById('toggleLogAccount');
        const logAccountStatus = document.getElementById('logAccountStatus');
        
        if (toggleLogAccount) {
            toggleLogAccount.onclick = (e) => {
                e.stopPropagation();
                
                if (!isVIPActive) {
                    showVIPModal((success) => {
                        if (success) {
                            toggleLogAccount.classList.add('active');
                            logAccountStatus.innerHTML = '🚧 Đang phát triển (VIP)';
                            logAccountStatus.style.color = '#ff9800';
                            updateVIPBadge();
                            updateMenuAfterLogin();
                        }
                    });
                    return;
                }
                
                const isActive = toggleLogAccount.classList.contains('active');
                if (isActive) {
                    toggleLogAccount.classList.remove('active');
                    logAccountStatus.innerHTML = '🔴 Chưa kích hoạt';
                    logAccountStatus.style.color = '#aaa';
                } else {
                    toggleLogAccount.classList.add('active');
                    logAccountStatus.innerHTML = '🚧 Đang phát triển (VIP)';
                    logAccountStatus.style.color = '#ff9800';
                }
            };
        }
        
        const activateBtn = document.getElementById('activeVipNowBtn');
        if (activateBtn) {
            activateBtn.onclick = (e) => {
                e.stopPropagation();
                showVIPModal((success) => {
                    if (success) {
                        updateVIPBadge();
                        createVipSubmenu();
                        updateMenuAfterLogin();
                    }
                });
            };
        }
        
        const logoutBtn = document.getElementById('logoutVipBtn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.stopPropagation();
                setStorage('userKey', '');
                setStorage('keyDate', '');
                isVIPActive = false;
                createVipSubmenu();
                updateMenuAfterLogin();
            };
        }
    }
    
    function updateVIPBadge() {
        const vipBadges = document.querySelectorAll('.vip-badge:not(.active-vip)');
        vipBadges.forEach(badge => {
            if (isVIPActive) {
                badge.classList.add('active-vip');
                badge.textContent = 'ACTIVE';
            } else {
                badge.classList.remove('active-vip');
                badge.textContent = 'VIP';
            }
        });
    }
    
    // ========== TẠO NÚT MENU TRÒN ==========
    const fab = document.createElement('div');
    fab.className = 'main-menu-fab';
    fab.innerHTML = '<img src="https://i.postimg.cc/3wJFzXWv/resized-image.jpg" alt="Menu">';
    document.body.appendChild(fab);
    
    // ========== TẠO PANEL MENU CHÍNH (CÓ ITEM ĐĂNG NHẬP) ==========
    const panel = document.createElement('div');
    panel.className = 'main-menu-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
        <div class="main-menu-header" id="mainMenuHeader">
            <span class="main-menu-title">Control Panel ${isVIPActive ? '<span class="vip-badge active-vip" style="margin-left:8px;">VIP</span>' : ''}</span>
            <button class="main-menu-close" id="closeMenuBtn">✖</button>
        </div>
        <div class="main-menu-content">
            <div class="menu-item" id="loginItem">
                <div class="menu-item-left">
                    <span class="menu-item-title">🔐 Đăng nhập</span>
                    <span class="menu-item-desc">Đăng nhập để sử dụng các tính năng</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
    
    // Xử lý đăng nhập
    const loginItem = document.getElementById('loginItem');
    if (loginItem) {
        loginItem.onclick = () => {
            showLoginModal();
        };
    }
    
    // ========== KÉO THẢ ==========
    function makeDraggable(element, dragHandle = null, onClickCallback = null) {
        let isDragging = false;
        let dragStarted = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;
        
        const handle = dragHandle || element;
        
        const onStart = (clientX, clientY) => {
            isDragging = true;
            dragStarted = false;
            startX = clientX;
            startY = clientY;
            
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            element.style.cursor = 'grabbing';
            if (dragHandle) dragHandle.style.cursor = 'grabbing';
        };
        
        const onMove = (clientX, clientY) => {
            if (!isDragging) return;
            const dx = clientX - startX;
            const dy = clientY - startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragStarted = true;
            
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            newLeft = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, newTop));
            
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        };
        
        const onEnd = () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = '';
                if (dragHandle) dragHandle.style.cursor = '';
                if (!dragStarted && onClickCallback) onClickCallback();
                dragStarted = false;
            }
        };
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            onStart(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => {
            if (isDragging) onMove(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', onEnd);
        
        handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            onStart(touch.clientX, touch.clientY);
        });
        window.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                const touch = e.touches[0];
                onMove(touch.clientX, touch.clientY);
            }
        });
        window.addEventListener('touchend', onEnd);
    }
    
    makeDraggable(fab, null, () => {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });
    
    const panelHeader = document.getElementById('mainMenuHeader');
    makeDraggable(panel, panelHeader, null);
    
    document.getElementById('closeMenuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        panel.style.display = 'none';
    });
    
    // ========== KHỞI ĐỘNG ==========
    async function init() {
        await loadKeys();
        
        const savedKey = getStorage('userKey', '');
        const savedDate = getStorage('keyDate', '');
        const todayStr = getTodayString();
        const todayKey = getTodayKey();
        
        if (savedKey && savedDate === todayStr && savedKey === todayKey) {
            isVIPActive = true;
            updateVIPBadge();
        }
        
        // Kiểm tra đã đăng nhập chưa
        const savedLogin = getStorage('isLoggedIn', 'false');
        if (savedLogin === 'true') {
            isLoggedIn = true;
            currentUsername = getStorage('gameUsername', '');
            updateMenuAfterLogin();
        }
        
        console.log('%c✅ Control Panel v3.2 (có đăng nhập) đã sẵn sàng!', 'color: #0f0; font-size: 14px');
        console.log('%c👑 Click vào nút tròn -> Đăng nhập để dùng tính năng', 'color: #ffd700;');
        console.log('%c💡 Nhập username/password bất kỳ để đăng nhập', 'color: #00adb5;');
    }
    
    init();
})();