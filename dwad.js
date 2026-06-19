        // ============================= PARTICLES =============================
        (function () {
            const canvas = document.getElementById('particleCanvas');
            const ctx = canvas.getContext('2d');
            let W, H, particles = [];
            function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
            resize(); window.addEventListener('resize', resize);
            class Particle {
                constructor() { this.reset(); }
                reset() {
                    this.x = Math.random() * W;
                    this.y = Math.random() * H;
                    this.r = Math.random() * 1.5 + 0.3;
                    this.vx = (Math.random() - 0.5) * 0.3;
                    this.vy = (Math.random() - 0.5) * 0.3;
                    this.alpha = Math.random() * 0.6 + 0.1;
                    this.hue = Math.random() > 0.5 ? 195 : 45;
                }
                update() {
                    this.x += this.vx; this.y += this.vy;
                    if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
                }
                draw() {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.alpha})`;
                    ctx.fill();
                }
            }
            for (let i = 0; i < 120; i++) particles.push(new Particle());
            function anim() {
                ctx.clearRect(0, 0, W, H);
                // Draw lines between close particles
                for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                        const dx = particles[i].x - particles[j].x;
                        const dy = particles[i].y - particles[j].y;
                        const d = Math.sqrt(dx * dx + dy * dy);
                        if (d < 100) {
                            ctx.beginPath();
                            ctx.moveTo(particles[i].x, particles[i].y);
                            ctx.lineTo(particles[j].x, particles[j].y);
                            ctx.strokeStyle = `rgba(0,212,255,${0.06 * (1 - d / 100)})`;
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                        }
                    }
                    particles[i].update();
                    particles[i].draw();
                }
                requestAnimationFrame(anim);
            }
            anim();
        })();

        // ============================= MOCK DB =============================
        const mockDB = {
            users: [
                { id: 1, username: 'admin', role: 'Admin', status: 'Active' },
                { id: 2, username: 'user', role: 'User', status: 'Active' }
            ],
            estimates_log: [
                { id: 101, username: 'admin', timestamp: '2026-06-19 14:15', system_kw: 5.0, cost_thb: 150000, annual_saving: 29800, payback_years: 5.03, lat: 14.4740, lon: 100.1170 },
                { id: 102, username: 'user', timestamp: '2026-06-19 11:30', system_kw: 10.0, cost_thb: 280000, annual_saving: 61200, payback_years: 4.58, lat: 13.7563, lon: 100.5018 }
            ],
            comparison_data: [
                { location: 'บ้านโป่ง', annual_kwh: 7520, desc: 'Top 8%' },
                { location: 'นครปฐม', annual_kwh: 7350, desc: 'Top 18%' },
                { location: 'สุพรรณบุรี', annual_kwh: 7690, desc: 'Top 4%' }
            ]
        };
        let currentRole = 'user', currentUser = mockDB.users[1];
        let lat = 14.474, lon = 100.117;
        let panelCleanliness = 0.915;

        // ============================= LOGIN =============================
        function setLoginRole(role) {
            currentRole = role;
            if (role === 'admin') {
                document.getElementById('btnTabAdmin').classList.add('active');
                document.getElementById('btnTabUser').classList.remove('active');
                document.getElementById('usernameInput').value = 'admin';
                document.getElementById('passwordInput').value = 'admin123';
                document.getElementById('loginHint').textContent = 'Admin: admin / admin123';
            } else {
                document.getElementById('btnTabUser').classList.add('active');
                document.getElementById('btnTabAdmin').classList.remove('active');
                document.getElementById('usernameInput').value = 'user';
                document.getElementById('passwordInput').value = 'user123';
                document.getElementById('loginHint').textContent = 'บัญชีผู้ใช้: user / user123 | Admin: admin / admin123';
            }
        }
        function login() {
            const u = document.getElementById('usernameInput').value;
            const p = document.getElementById('passwordInput').value;
            if (currentRole === 'admin' && u === 'admin' && p === 'admin123') {
                currentUser = mockDB.users[0];
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('userAvatar').textContent = 'A';
                document.getElementById('userNameDisplay').textContent = 'admin';
                document.getElementById('userRoleDisplay').textContent = 'Administrator';
                document.getElementById('btn-page-database').style.display = 'flex';
                document.getElementById('admin-section-label').style.display = 'block';
                runSQL();
                setTimeout(() => { mainMap.invalidateSize(); satMap2.invalidateSize(); }, 300);
            } else if (currentRole === 'user' && u === 'user' && p === 'user123') {
                currentUser = mockDB.users[1];
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('userAvatar').textContent = 'U';
                document.getElementById('userNameDisplay').textContent = 'user';
                document.getElementById('userRoleDisplay').textContent = 'User Account';
                document.getElementById('btn-page-database').style.display = 'none';
                document.getElementById('admin-section-label').style.display = 'none';
                setTimeout(() => { mainMap.invalidateSize(); satMap2.invalidateSize(); }, 300);
            } else {
                alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
        }
        function logout() {
            document.getElementById('loginOverlay').style.display = 'flex';
            setLoginRole('user');
        }

        // ============================= MAPS =============================
        const streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
        const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' });
        const mainMap = L.map('map').setView([lat, lon], 8);
        streetLayer.addTo(mainMap);

        const heatData = [
            [13.7563, 100.5018, 0.6], [14.0132, 99.9882, 0.7], [14.474, 100.117, 0.85],
            [13.8188, 100.0401, 0.55], [13.5283, 99.8236, 0.9], [14.0041, 99.5476, 0.95],
            [14.2106, 100.5847, 0.65], [13.5435, 100.2758, 0.5]
        ];
        let heatLayer = L.heatLayer(heatData, { radius: 40, blur: 25, maxZoom: 10, gradient: { '0.3': 'rgba(34,197,94,0.5)', '0.7': 'rgba(234,179,8,0.6)', '1.0': 'rgba(239,68,68,0.7)' } }).addTo(mainMap);
        let heatOn = true, mainMarker;

        function setMapLayer(m) {
            if (m === 'satellite') { mainMap.removeLayer(streetLayer); satLayer.addTo(mainMap); }
            else { mainMap.removeLayer(satLayer); streetLayer.addTo(mainMap); }
        }
        function toggleHeatmap() {
            heatOn ? mainMap.removeLayer(heatLayer) : heatLayer.addTo(mainMap);
            heatOn = !heatOn;
        }
        mainMap.on('click', e => {
            if (isDrawingMode) return;
            lat = e.latlng.lat; lon = e.latlng.lng;
            if (mainMarker) mainMap.removeLayer(mainMarker);
            mainMarker = L.marker([lat, lon]).addTo(mainMap);
            mainMarker.bindPopup('<b>⏳ กำลังดึงข้อมูล NASA...</b>').openPopup();
            calculate();
        });

        // SAT MAP (2nd map)
        const satMap2 = L.map('satMap').setView([lat, lon], 13);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' }).addTo(satMap2);
        let drawPoints = [], drawMarkers = [], drawPolyline, drawPolygon, isDrawingMode = false;

        function calculatePolygonArea(latlngs) {
            if (latlngs.length < 3) return 0;
            let area = 0; const R = 6378137;
            const coords = latlngs.map(ll => ({
                x: ll.lng * (Math.PI / 180) * R * Math.cos(ll.lat * Math.PI / 180),
                y: ll.lat * (Math.PI / 180) * R
            }));
            let j = coords.length - 1;
            for (let i = 0; i < coords.length; i++) {
                area += (coords[j].x + coords[i].x) * (coords[j].y - coords[i].y); j = i;
            }
            return Math.abs(area / 2);
        }
        function startDrawing() {
            isDrawingMode = true; drawPoints = []; drawMarkers.forEach(m => satMap2.removeLayer(m)); drawMarkers = [];
            if (drawPolyline) satMap2.removeLayer(drawPolyline);
            if (drawPolygon) satMap2.removeLayer(drawPolygon);
            document.getElementById('drawStatus').innerHTML = 'สถานะ: <span>📍 กำลังวาด — คลิกพิกัดมุมหลังคา (อย่างน้อย 3 จุด)</span>';
        }
        function stopDrawing() {
            isDrawingMode = false;
            if (drawPoints.length < 3) { alert('กรุณาเลือกจุดอย่างน้อย 3 จุด'); return; }
            if (drawPolyline) satMap2.removeLayer(drawPolyline);
            drawPolygon = L.polygon(drawPoints, { color: '#00d4ff', fillColor: '#00d4ff', fillOpacity: 0.25 }).addTo(satMap2);
            const area = calculatePolygonArea(drawPoints);
            const panels = Math.floor(area / 2.5);
            const cap = panels * 0.8;
            document.getElementById('drawArea').textContent = area.toFixed(1);
            document.getElementById('drawPanels').textContent = panels;
            document.getElementById('drawCapacity').textContent = cap.toFixed(2);
            document.getElementById('drawStatus').innerHTML = 'สถานะ: <span>✅ วิเคราะห์สำเร็จ! คำนวณพื้นที่หลังคาแล้ว</span>';
        }
        function deleteLastPoint() {
            if (!isDrawingMode || !drawPoints.length) return;
            drawPoints.pop();
            const m = drawMarkers.pop(); if (m) satMap2.removeLayer(m);
            if (drawPolyline) satMap2.removeLayer(drawPolyline);
            if (drawPoints.length > 0) drawPolyline = L.polyline(drawPoints, { color: '#00d4ff', weight: 3 }).addTo(satMap2);
            document.getElementById('drawStatus').innerHTML = `สถานะ: <span>ลบจุดล่าสุด — เหลือ ${drawPoints.length} จุด</span>`;
        }
        function clearDrawing() {
            isDrawingMode = false; drawPoints = [];
            drawMarkers.forEach(m => satMap2.removeLayer(m)); drawMarkers = [];
            if (drawPolyline) satMap2.removeLayer(drawPolyline);
            if (drawPolygon) satMap2.removeLayer(drawPolygon);
            ['drawArea', 'drawPanels', 'drawCapacity'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = id === 'drawCapacity' ? '0.00' : '0'; });
            document.getElementById('drawStatus').innerHTML = 'สถานะ: <span>กดปุ่ม เริ่มวาด แล้วคลิกจุดมุมบนแผนที่</span>';
        }
        function applyDrawCapacity() {
            const cap = parseFloat(document.getElementById('drawCapacity').textContent);
            if (cap <= 0) { alert('กรุณาวาดพื้นที่หลังคาก่อน'); return; }
            document.getElementById('kw').value = cap.toFixed(1);
            document.getElementById('price').value = Math.round(cap * 30000);
            updateSlider();
            switchPage('page-dashboard');
            calculate();
        }
        satMap2.on('click', e => {
            if (!isDrawingMode) return;
            drawPoints.push(e.latlng);
            if (drawPolyline) satMap2.removeLayer(drawPolyline);
            drawPolyline = L.polyline(drawPoints, { color: '#00d4ff', weight: 3 }).addTo(satMap2);
            const m = L.circleMarker(e.latlng, { radius: 4, color: '#00d4ff', fillColor: '#fff', fillOpacity: 1 }).addTo(satMap2);
            drawMarkers.push(m);
        });

        // ============================= NAVIGATION =============================
        const pagesMeta = {
            'page-dashboard': { title: 'แดชบอร์ดคำนวณ & ROI Analysis', sub: 'เลือกพิกัดบนแผนที่เพื่อเริ่มการวิเคราะห์' },
            'page-satellite': { title: 'แผนที่ดาวเทียม & วาดหลังคา', sub: 'วาดพื้นที่หลังคาเพื่อคำนวณขนาดการติดตั้ง' },
            'page-twin': { title: '3D Digital Twin House', sub: 'แบบจำลองดวงอาทิตย์และกำลังผลิต Real-time' },
            'page-chatbot': { title: 'AI Solar Advisor Chatbot', sub: 'ปัญญาประดิษฐ์ให้คำแนะนำเชิงเทคนิค' },
            'page-forecast': { title: 'AI พยากรณ์รายสัปดาห์', sub: 'คาดการณ์การผลิตไฟฟ้า 7 วันล่วงหน้า' },
            'page-database': { title: 'MySQL Database Console', sub: 'จัดการ SQL database หลังบ้าน' }
        };
        function switchPage(id) {
            document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.classList.add('active');
            const m = pagesMeta[id] || {};
            document.getElementById('topbarTitle').textContent = m.title || '';
            document.getElementById('topbarSub').textContent = m.sub || '';
            if (id === 'page-twin') { init3D(); setTimeout(updateSunSim, 100); }
            if (id === 'page-dashboard') { setTimeout(() => mainMap.invalidateSize(), 200); }
            if (id === 'page-satellite') { setTimeout(() => satMap2.invalidateSize(), 200); }
        }

        // ============================= SLIDERS =============================
        function updateSlider() {
            const v = parseFloat(document.getElementById('kw').value);
            document.getElementById('sliderSizeVal').textContent = v.toFixed(1) + ' kW';
            document.getElementById('price').value = Math.round(v * 30000);
            updateSliderFill('kw', 1, 20);
        }
        function updateSelfVal() {
            const v = document.getElementById('selfConsumption').value;
            document.getElementById('sliderSelfVal').textContent = v + '%';
            updateSliderFill('selfConsumption', 10, 100);
        }
        function updateSliderFill(id, min, max) {
            const inp = document.getElementById(id);
            const pct = ((inp.value - min) / (max - min)) * 100;
            inp.style.setProperty('--pct', pct + '%');
        }
        function toggleNM() {
            document.getElementById('selfConsGroup').style.display = document.getElementById('netMetering').checked ? 'block' : 'none';
        }
        updateSlider();

        // ============================= COUNTER ANIMATION =============================
        function animateCounter(el, target, decimals = 0, prefix = '', suffix = '') {
            const start = 0, dur = 800;
            const startTime = performance.now();
            function step(now) {
                const t = Math.min((now - startTime) / dur, 1);
                const ease = 1 - Math.pow(1 - t, 3);
                const val = start + (target - start) * ease;
                el.textContent = prefix + (decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        // ============================= MAIN CALCULATE =============================
        let monthlyChartInst;
        async function calculate() {
            const kw = parseFloat(document.getElementById('kw').value);
            const installPrice = parseFloat(document.getElementById('price').value);
            const unitPrice = parseFloat(document.getElementById('unitPrice').value);
            if (isNaN(kw) || kw <= 0 || isNaN(installPrice) || installPrice < 0 || isNaN(unitPrice) || unitPrice < 0) {
                alert('กรุณากรอกค่าพารามิเตอร์ที่ถูกต้อง'); return;
            }

            document.getElementById('welcomeState').style.display = 'none';
            document.getElementById('dashResults').style.display = 'none';
            document.getElementById('loadingState').style.display = 'flex';

            const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error('ไม่สามารถติดต่อ NASA API');
                const data = await res.json();
                const irr = data.properties.parameter.ALLSKY_SFC_SW_DWN.ANN;
                if (irr === undefined || irr === null || irr < 0) throw new Error('พิกัดนี้อยู่นอกเขตวิเคราะห์');

                if (mainMarker) mainMarker.bindPopup(`<b>📍 วิเคราะห์สำเร็จ</b><br>☀️ ${irr.toFixed(2)} kWh/m²/วัน`).openPopup();

                // AI Predictive Maintenance
                if (panelCleanliness < 1.0) {
                    const dustFactor = Math.abs(Math.sin(lat) * Math.cos(lon));
                    panelCleanliness = 0.95 - (dustFactor * 0.1);
                    panelCleanliness = Math.max(0.7, panelCleanliness);
                }

                const eff = 0.8 * panelCleanliness;
                const daily = kw * irr * eff;
                const monthly = daily * 30;
                const yearly = daily * 365;

                const nmCheck = document.getElementById('netMetering').checked;
                const selfPct = nmCheck ? parseFloat(document.getElementById('selfConsumption').value) : 100;
                const selfPct2 = selfPct / 100;
                const dailySelfUsed = daily * selfPct2;
                const dailySold = daily * (1 - selfPct2);
                const saving = (dailySelfUsed * unitPrice + dailySold * 2.2) * 365;
                const payback = saving > 0 ? installPrice / saving : 0;
                const profit25 = saving * 25 - installPrice;

                // Update KPIs with animation
                document.getElementById('loadingState').style.display = 'none';
                document.getElementById('dashResults').style.display = 'block';

                document.getElementById('resLat').textContent = lat.toFixed(4);
                document.getElementById('resLng').textContent = lon.toFixed(4);

                animateCounter(document.getElementById('valRadiation'), irr, 2);
                animateCounter(document.getElementById('valDaily'), daily, 2);
                animateCounter(document.getElementById('valMonthly'), monthly, 2);
                animateCounter(document.getElementById('valYearly'), yearly, 0);
                animateCounter(document.getElementById('valSaving'), saving, 0);
                animateCounter(document.getElementById('valPayback'), payback, 1);

                // AI Capacity Optimization
                let optimalKw = kw;
                let optPanels = Math.ceil(optimalKw * 1000 / 800);
                let optArea = (optPanels * 1.7).toFixed(1);
                document.getElementById('aiOptKw').textContent = optimalKw.toFixed(1) + ' kW';
                document.getElementById('aiOptPanels').textContent = optPanels + ' แผง';
                document.getElementById('aiOptArea').textContent = optArea;



                // ROI
                document.getElementById('roiYear1').textContent = Math.round(saving).toLocaleString() + ' ฿';
                document.getElementById('roiYear5').textContent = Math.round(saving * 5).toLocaleString() + ' ฿';
                document.getElementById('roiYear10').textContent = Math.round(saving * 10).toLocaleString() + ' ฿';
                document.getElementById('roiYear25').textContent = Math.round(saving * 25).toLocaleString() + ' ฿';
                document.getElementById('netProfit25').textContent = Math.round(profit25).toLocaleString() + ' บาท';
                document.getElementById('netProfit25').style.color = profit25 >= 0 ? 'var(--green)' : 'var(--pink)';

                // Ranking
                document.getElementById('rankCard').style.display = 'block';
                document.getElementById('rankCurrentRow').style.display = 'table-row';
                document.getElementById('rankCurrentVal').textContent = Math.round(yearly).toLocaleString() + ' kWh';
                let rankTxt, rankSub2, rankBadge, rankColor;
                if (irr > 5.4) { rankTxt = '📍 พื้นที่ของคุณจัดอยู่ใน Top 5% ของประเทศไทย!'; rankSub2 = 'รังสีแสงแดดสูงเป็นพิเศษ คุ้มทุนสูงสุด'; rankBadge = 'Top 5% ดีเลิศ'; rankColor = 'var(--green)'; }
                else if (irr > 5.0) { rankTxt = '📍 พื้นที่ของคุณ Top 15% ของประเทศไทย'; rankSub2 = 'รังสีดวงอาทิตย์สูง เหมาะสมติดตั้ง'; rankBadge = 'Top 15% ดีมาก'; rankColor = 'var(--accent)'; }
                else { rankTxt = '📍 พื้นที่ของคุณ Top 35% ของประเทศไทย'; rankSub2 = 'รังสีปกติ ยังคุ้มค่าในระยะยาว'; rankBadge = 'Top 35% ปกติ'; rankColor = 'var(--primary)'; }
                document.getElementById('rankText').textContent = rankTxt;
                document.getElementById('rankSub').textContent = rankSub2;
                document.getElementById('rankBadge').textContent = rankBadge;
                document.getElementById('rankBadge').style.color = rankColor;

                // 7-Day forecast
                renderForecast(daily);

                // Monthly chart
                const mList = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                const mLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const mData = mList.map(m => { let v = data.properties.parameter.ALLSKY_SFC_SW_DWN[m]; if (!v || v < 0) v = irr; return kw * v * eff * 30; });
                drawChart(mLabels, mData);

                // Log to DB
                mockDB.estimates_log.unshift({
                    id: mockDB.estimates_log.length + 101,
                    username: currentUser.username,
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                    system_kw: kw, cost_thb: installPrice,
                    annual_saving: Math.round(saving),
                    payback_years: parseFloat(payback.toFixed(2)),
                    lat: parseFloat(lat.toFixed(4)), lon: parseFloat(lon.toFixed(4))
                });
                if (currentRole === 'admin') runSQL();

            } catch (err) {
                document.getElementById('loadingState').style.display = 'none';
                document.getElementById('welcomeState').style.display = 'flex';
                alert('เกิดข้อผิดพลาด: ' + err.message);
                if (mainMarker) mainMarker.bindPopup('⚠️ ดึงข้อมูลล้มเหลว').openPopup();
                console.error(err);
            }
        }

        // ============================= CHART =============================
        function drawChart(labels, data) {
            const ctx = document.getElementById('monthlyChart');
            if (monthlyChartInst) monthlyChartInst.destroy();
            const ctx2d = ctx.getContext('2d');
            const grad = ctx2d.createLinearGradient(0, 0, 0, 260);
            grad.addColorStop(0, 'rgba(0,212,255,0.4)');
            grad.addColorStop(1, 'rgba(0,212,255,0.0)');
            monthlyChartInst = new Chart(ctx, {
                type: 'line',
                data: {
                    labels, datasets: [{
                        label: 'kWh/เดือน', data,
                        borderColor: '#00d4ff', borderWidth: 2.5,
                        backgroundColor: grad, fill: true, tension: 0.4,
                        pointBackgroundColor: '#00d4ff',
                        pointHoverRadius: 6, pointRadius: 3,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${Math.round(ctx.raw).toLocaleString()} kWh` } } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7ba8cc', font: { family: 'Outfit', weight: '600' } } },
                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7ba8cc', font: { family: 'Outfit' }, callback: v => v.toLocaleString() } }
                    }
                }
            });
        }

        // ============================= FORECAST =============================
        function renderForecast(dailyKwh) {
            const list = document.getElementById('forecastList');
            list.innerHTML = '';
            const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
            const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const wx = [
                { icon: 'fa-sun', text: 'แดดจัด ท้องฟ้าแจ่มใส', var: 1.05, color: 'var(--accent)' },
                { icon: 'fa-cloud-sun', text: 'เมฆบางส่วน แดดดี', var: 0.95, color: 'var(--accent)' },
                { icon: 'fa-cloud', text: 'ครึ้มฟ้า เมฆหนา', var: 0.65, color: 'var(--muted)' },
                { icon: 'fa-sun', text: 'แดดจัด ท้องฟ้าใส', var: 1.02, color: 'var(--accent)' },
                { icon: 'fa-cloud-showers-heavy', text: 'ฝนตกบางเวลา', var: 0.35, color: 'var(--primary)' },
                { icon: 'fa-cloud-sun', text: 'เมฆลอยกระจาย แดดปานกลาง', var: 0.88, color: 'var(--accent)' },
                { icon: 'fa-sun', text: 'แดดจัดร้อน ท้องฟ้าใส', var: 1.08, color: 'var(--accent)' }
            ];
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const dayName = thaiDays[d.getDay()];
                const dateNum = d.getDate();
                const monthStr = thaiMonths[d.getMonth()];
                const yearBE = d.getFullYear() + 543;
                const isToday = i === 0;
                const label = isToday ? `<b style="color:var(--primary);">วันนี้</b>` : dayName;
                const dateStr = `${dateNum} ${monthStr} ${yearBE}`;

                const w = wx[i], kwh = (dailyKwh * w.var).toFixed(1);
                const row = document.createElement('div'); row.className = 'forecast-row';
                row.innerHTML = `
                    <span class="forecast-name" style="display:flex;flex-direction:column;gap:2px;min-width:160px;">
                        <span style="font-weight:700;font-size:0.92rem;">${label}</span>
                        <span style="font-size:0.75rem;color:var(--muted);font-weight:500;">${dateStr}</span>
                    </span>
                    <span class="forecast-weather"><i class="fa-solid ${w.icon}" style="color:${w.color};"></i> ${w.text}</span>
                    <span class="forecast-kwh">${kwh} kWh</span>`;
                list.appendChild(row);
            }
        }




        // ============================= BATTERY =============================
        function recommendBat() {
            const load = parseFloat(document.getElementById('nightLoad').value) || 8;
            const size = (load / 0.8).toFixed(1);
            document.getElementById('batSize').textContent = size + ' kWh';
            let model = 'Tesla Powerwall หรือ LFP 48V 200Ah';
            if (load > 15) model = 'Pylontech H48074 หรือ LFP Rack 100kWh Industrial';
            else if (load > 10) model = 'CATL 20kWh LFP หรือ BYD Battery Box Premium LV';
            document.getElementById('batModel').textContent = model;
        }

        // ============================= THEME =============================
        let isDark = true;
        function toggleTheme() {
            isDark = !isDark;
            if (!isDark) {
                document.documentElement.style.setProperty('--bg', '#f1f5f9');
                document.documentElement.style.setProperty('--bg2', '#e2e8f0');
                document.documentElement.style.setProperty('--bg3', '#cbd5e1');
                document.documentElement.style.setProperty('--card', '#ffffff');
                document.documentElement.style.setProperty('--card2', '#f8fafc');
                document.documentElement.style.setProperty('--text', '#0f172a');
                document.documentElement.style.setProperty('--muted', '#64748b');
                document.documentElement.style.setProperty('--border', 'rgba(99,179,237,0.2)');
                document.documentElement.style.setProperty('--border2', 'rgba(99,179,237,0.35)');
                document.getElementById('themeLabel').textContent = 'Dark Mode';
                document.getElementById('themeIconTop').className = 'fa-solid fa-sun';
            } else {
                document.documentElement.style.setProperty('--bg', '#03050f');
                document.documentElement.style.setProperty('--bg2', '#080d1a');
                document.documentElement.style.setProperty('--bg3', '#0d1526');
                document.documentElement.style.setProperty('--card', '#0f1b30');
                document.documentElement.style.setProperty('--card2', '#111e33');
                document.documentElement.style.setProperty('--text', '#e8f4fd');
                document.documentElement.style.setProperty('--muted', '#7ba8cc');
                document.documentElement.style.setProperty('--border', 'rgba(99,179,237,0.12)');
                document.documentElement.style.setProperty('--border2', 'rgba(99,179,237,0.22)');
                document.getElementById('themeLabel').textContent = 'Light Mode';
                document.getElementById('themeIconTop').className = 'fa-solid fa-moon';
            }
        }

        // ============================= THREE.JS =============================
        let scene3D, camera3D, renderer3D, sunMesh3D, sunLight3D, is3D = false;
        function init3D() {
            if (is3D) return;
            const c = document.getElementById('threejs-container');
            const W = c.clientWidth, H = 340;
            scene3D = new THREE.Scene();
            scene3D.background = new THREE.Color(0x020c1b);
            scene3D.fog = new THREE.FogExp2(0x020c1b, 0.035);

            camera3D = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
            camera3D.position.set(9, 7, 10); camera3D.lookAt(0, 1.2, 0);

            renderer3D = new THREE.WebGLRenderer({ antialias: true });
            renderer3D.setSize(W, H); renderer3D.shadowMap.enabled = true;
            c.appendChild(renderer3D.domElement);

            scene3D.add(new THREE.AmbientLight(0x223344, 0.6));
            sunLight3D = new THREE.DirectionalLight(0xfff4e0, 1.2);
            sunLight3D.position.set(10, 10, 5); sunLight3D.castShadow = true;
            scene3D.add(sunLight3D);

            // Grid helper
            const grid = new THREE.GridHelper(30, 20, 0x0a1a2e, 0x0a1a2e);
            scene3D.add(grid);

            // Ground
            const gnd = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x0a1520, roughness: 1 }));
            gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; scene3D.add(gnd);

            // House base
            const base = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.1, roughness: 0.7 }));
            base.position.y = 1.25; base.castShadow = true; base.receiveShadow = true; scene3D.add(base);

            // Roof
            const roofGeo = new THREE.ConeGeometry(3.4, 1.8, 4);
            const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x0d2137, metalness: 0.1, roughness: 0.8 }));
            roof.position.y = 3.4; roof.rotation.y = Math.PI / 4; roof.castShadow = true; scene3D.add(roof);

            // Solar panels (glowing blue)
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x003388, metalness: 0.9, roughness: 0.15, emissive: 0x001144, emissiveIntensity: 0.3 });
            const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7), panelMat);
            panel.position.set(0, 3.4, 1.2); panel.rotation.set(-Math.PI / 6, 0, 0); scene3D.add(panel);
            const panel2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7), panelMat);
            panel2.position.set(1.2, 3.3, 1.1); panel2.rotation.set(-Math.PI / 6, 0, 0); scene3D.add(panel2);

            // Sun sphere
            sunMesh3D = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
            // Sun glow
            const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff9900, transparent: true, opacity: 0.2 }));
            sunMesh3D.add(sunGlow);
            scene3D.add(sunMesh3D);

            // Point light from sun
            const pLight = new THREE.PointLight(0xffee88, 0.5, 30);
            sunMesh3D.add(pLight);

            is3D = true; animate3D();
        }
        function animate3D() {
            requestAnimationFrame(animate3D);
            if (scene3D) scene3D.rotation.y += 0.003;
            if (renderer3D) renderer3D.render(scene3D, camera3D);
        }
        function updateSunSim() {
            const val = parseFloat(document.getElementById('timeSlider').value);
            const h = Math.floor(val), m = val % 1 === 0 ? '00' : '30';
            document.getElementById('sliderTimeVal').textContent = `${h}:${m} น.`;
            updateSliderFill('timeSlider', 6, 18);

            const t = (val - 6) / 12;
            const angle = Math.PI - t * Math.PI;
            const r = 10;
            const x = r * Math.cos(angle), y = r * Math.sin(angle), z = 2;
            if (sunMesh3D) sunMesh3D.position.set(x, y, z);
            if (sunLight3D) { sunLight3D.position.set(x, y, z); sunLight3D.intensity = Math.max(0.05, Math.sin(angle) * 1.3); }

            const deg = Math.round(t * 180);
            document.getElementById('rtSunAngle').textContent = deg;
            document.getElementById('rtShadowVal').textContent = Math.round(5 + (1 - Math.sin(angle)) * 75);
            document.getElementById('rtShadowVal2').textContent = Math.round(5 + (1 - Math.sin(angle)) * 75) + '%';

            const eff = Math.max(0, Math.round(Math.sin(angle) * 100));
            document.getElementById('rtPanelEff').textContent = eff + '%';

            const kw = parseFloat(document.getElementById('kw').value) || 5;
            const out = eff > 0 ? (kw * (eff / 100) * 0.9) : 0;
            document.getElementById('rtPowerOutput').textContent = out.toFixed(2);
            document.getElementById('rtPowerOutput2').textContent = out.toFixed(2) + ' kW';

            let status = 'เฉียงขึ้น (เช้า)';
            if (val > 11 && val < 13) status = 'ตรงจุดหัว (เที่ยง)';
            else if (val >= 13) status = 'เฉียงลง (บ่าย)';
            document.getElementById('rtSunStatus').textContent = status;
        }

        // ============================= CHATBOT =============================
        const msgs = [{ role: 'ai', text: 'สวัสดีครับ! ยินดีต้อนรับสู่ <b>AI Solar Advisor</b> 🤖☀️<br><br>ผมพร้อมช่วยวิเคราะห์เกี่ยวกับ <b>การติดตั้งโซลาร์เซลล์, ROI, ประสิทธิภาพแผง และการออกแบบระบบแบตเตอรี่</b> ครับ!' }];
        (() => {
            const now = new Date(), h = now.getHours(), min = now.getMinutes().toString().padStart(2, '0');
            const isNight = h >= 18 || h < 6;
            if (isNight) msgs[0].text += `<br><br>⚠️ <b>ตรวจพบช่วงกลางคืน (${h}:${min} น.)</b> แผงโซลาร์หยุดผลิตไฟแล้ว ระบบจะดึงพลังงานจากแบตเตอรี่หรือการไฟฟ้าครับ`;
            else msgs[0].text += `<br><br>☀️ <b>ช่วงกลางวัน (${h}:${min} น.)</b> แผงทำงานเต็มพิกัด คุณสามารถออกแบบหรือสอบถามสเปกระบบได้เลยครับ!`;
        })();

        // ===== Thai Province Solar Lookup Database =====
        const thaiProvinces = {
            'กรุงเทพ': { lat: 13.7563, lon: 100.5018, name: 'กรุงเทพมหานคร' },
            'กรุงเทพมหานคร': { lat: 13.7563, lon: 100.5018, name: 'กรุงเทพมหานคร' },
            'กทม': { lat: 13.7563, lon: 100.5018, name: 'กรุงเทพมหานคร' },
            'เชียงใหม่': { lat: 18.7883, lon: 98.9853, name: 'เชียงใหม่' },
            'เชียงราย': { lat: 19.9105, lon: 99.8406, name: 'เชียงราย' },
            'ภูเก็ต': { lat: 7.8804, lon: 98.3923, name: 'ภูเก็ต' },
            'ขอนแก่น': { lat: 16.4419, lon: 102.8360, name: 'ขอนแก่น' },
            'สงขลา': { lat: 7.1756, lon: 100.6143, name: 'สงขลา' },
            'หาดใหญ่': { lat: 7.0086, lon: 100.4747, name: 'หาดใหญ่ (สงขลา)' },
            'นครราชสีมา': { lat: 14.9799, lon: 102.0978, name: 'นครราชสีมา' },
            'โคราช': { lat: 14.9799, lon: 102.0978, name: 'นครราชสีมา' },
            'อุดรธานี': { lat: 17.4138, lon: 102.7878, name: 'อุดรธานี' },
            'นครสวรรค์': { lat: 15.7030, lon: 100.1372, name: 'นครสวรรค์' },
            'สุราษฎร์ธานี': { lat: 9.1382, lon: 99.3217, name: 'สุราษฎร์ธานี' },
            'ระยอง': { lat: 12.6810, lon: 101.2816, name: 'ระยอง' },
            'ชลบุรี': { lat: 13.3611, lon: 100.9847, name: 'ชลบุรี' },
            'พัทยา': { lat: 12.9236, lon: 100.8825, name: 'พัทยา' },
            'อยุธยา': { lat: 14.3532, lon: 100.5676, name: 'พระนครศรีอยุธยา' },
            'พระนครศรีอยุธยา': { lat: 14.3532, lon: 100.5676, name: 'พระนครศรีอยุธยา' },
            'ลำปาง': { lat: 18.2888, lon: 99.4983, name: 'ลำปาง' },
            'พิษณุโลก': { lat: 16.8211, lon: 100.2659, name: 'พิษณุโลก' },
            'นครปฐม': { lat: 13.8199, lon: 100.0624, name: 'นครปฐม' },
            'สมุทรปราการ': { lat: 13.5990, lon: 100.5998, name: 'สมุทรปราการ' },
            'นนทบุรี': { lat: 13.8621, lon: 100.5144, name: 'นนทบุรี' },
            'ปทุมธานี': { lat: 14.0208, lon: 100.5250, name: 'ปทุมธานี' },
            'กาญจนบุรี': { lat: 14.0023, lon: 99.5471, name: 'กาญจนบุรี' },
            'เพชรบุรี': { lat: 13.1119, lon: 99.9394, name: 'เพชรบุรี' },
            'ประจวบคีรีขันธ์': { lat: 11.8126, lon: 99.7958, name: 'ประจวบคีรีขันธ์' },
            'หัวหิน': { lat: 12.5684, lon: 99.9577, name: 'หัวหิน' },
            'กระบี่': { lat: 8.0863, lon: 98.9063, name: 'กระบี่' },
            'ตรัง': { lat: 7.5593, lon: 99.6114, name: 'ตรัง' },
            'นครศรีธรรมราช': { lat: 8.4321, lon: 99.9637, name: 'นครศรีธรรมราช' },
            'พังงา': { lat: 8.4511, lon: 98.5253, name: 'พังงา' },
            'เกาะสมุย': { lat: 9.5120, lon: 100.0607, name: 'เกาะสมุย' },
            'สมุย': { lat: 9.5120, lon: 100.0607, name: 'เกาะสมุย' },
            'อุบลราชธานี': { lat: 15.2283, lon: 104.8585, name: 'อุบลราชธานี' },
            'อุบล': { lat: 15.2283, lon: 104.8585, name: 'อุบลราชธานี' },
            'นครพนม': { lat: 17.3923, lon: 104.7690, name: 'นครพนม' },
            'สกลนคร': { lat: 17.1554, lon: 104.1349, name: 'สกลนคร' },
            'กาฬสินธุ์': { lat: 16.4314, lon: 103.5059, name: 'กาฬสินธุ์' },
            'มหาสารคาม': { lat: 16.1846, lon: 103.3017, name: 'มหาสารคาม' },
            'ร้อยเอ็ด': { lat: 16.0538, lon: 103.6520, name: 'ร้อยเอ็ด' },
            'บุรีรัมย์': { lat: 14.9951, lon: 103.1116, name: 'บุรีรัมย์' },
            'สุรินทร์': { lat: 14.8820, lon: 103.4937, name: 'สุรินทร์' },
            'ศรีสะเกษ': { lat: 15.1186, lon: 104.3220, name: 'ศรีสะเกษ' },
            'เลย': { lat: 17.4860, lon: 101.7237, name: 'เลย' },
            'หนองคาย': { lat: 17.8782, lon: 102.7418, name: 'หนองคาย' },
            'น่าน': { lat: 18.7825, lon: 100.7763, name: 'น่าน' },
            'แพร่': { lat: 18.1444, lon: 100.1403, name: 'แพร่' },
            'แม่ฮ่องสอน': { lat: 19.3020, lon: 97.9654, name: 'แม่ฮ่องสอน' },
            'ลำพูน': { lat: 18.5747, lon: 99.0087, name: 'ลำพูน' },
            'อุตรดิตถ์': { lat: 17.6200, lon: 100.0991, name: 'อุตรดิตถ์' },
            'สุโขทัย': { lat: 17.0066, lon: 99.8265, name: 'สุโขทัย' },
            'กำแพงเพชร': { lat: 16.4820, lon: 99.5226, name: 'กำแพงเพชร' },
            'ตาก': { lat: 16.8798, lon: 99.1258, name: 'ตาก' },
            'เพชรบูรณ์': { lat: 16.4189, lon: 101.1589, name: 'เพชรบูรณ์' },
            'ลพบุรี': { lat: 14.7995, lon: 100.6534, name: 'ลพบุรี' },
            'สิงห์บุรี': { lat: 14.8905, lon: 100.3968, name: 'สิงห์บุรี' },
            'ชัยนาท': { lat: 15.1851, lon: 100.1257, name: 'ชัยนาท' },
            'อ่างทอง': { lat: 14.5896, lon: 100.4549, name: 'อ่างทอง' },
            'สระบุรี': { lat: 14.5289, lon: 100.9101, name: 'สระบุรี' },
            'นครนายก': { lat: 14.2059, lon: 101.2131, name: 'นครนายก' },
            'ปราจีนบุรี': { lat: 14.0522, lon: 101.3720, name: 'ปราจีนบุรี' },
            'สระแก้ว': { lat: 13.8246, lon: 102.0641, name: 'สระแก้ว' },
            'จันทบุรี': { lat: 12.6110, lon: 102.1038, name: 'จันทบุรี' },
            'ตราด': { lat: 12.2428, lon: 102.5174, name: 'ตราด' },
            'ฉะเชิงเทรา': { lat: 13.6904, lon: 101.0779, name: 'ฉะเชิงเทรา' },
            'สมุทรสาคร': { lat: 13.5475, lon: 100.2743, name: 'สมุทรสาคร' },
            'สมุทรสงคราม': { lat: 13.4098, lon: 100.0022, name: 'สมุทรสงคราม' },
            'ราชบุรี': { lat: 13.5360, lon: 99.8177, name: 'ราชบุรี' },
            'สุพรรณบุรี': { lat: 14.4744, lon: 100.1178, name: 'สุพรรณบุรี' },
            'ยะลา': { lat: 6.5421, lon: 101.2803, name: 'ยะลา' },
            'ปัตตานี': { lat: 6.8635, lon: 101.2503, name: 'ปัตตานี' },
            'นราธิวาส': { lat: 6.4251, lon: 101.8253, name: 'นราธิวาส' },
            'สตูล': { lat: 6.6238, lon: 100.0673, name: 'สตูล' },
            'พัทลุง': { lat: 7.6168, lon: 100.0742, name: 'พัทลุง' },
            'ชุมพร': { lat: 10.4930, lon: 99.1800, name: 'ชุมพร' },
            'ระนอง': { lat: 9.9529, lon: 98.6085, name: 'ระนอง' },
            'มุกดาหาร': { lat: 16.5425, lon: 104.7236, name: 'มุกดาหาร' },
            'อำนาจเจริญ': { lat: 15.8656, lon: 104.6259, name: 'อำนาจเจริญ' },
            'ยโสธร': { lat: 15.7928, lon: 104.1454, name: 'ยโสธร' },
            'หนองบัวลำภู': { lat: 17.2026, lon: 102.4394, name: 'หนองบัวลำภู' },
            'บึงกาฬ': { lat: 18.3609, lon: 103.6518, name: 'บึงกาฬ' },
            'ชัยภูมิ': { lat: 15.8068, lon: 102.0318, name: 'ชัยภูมิ' },
            'แม่สาย': { lat: 20.4307, lon: 99.8832, name: 'แม่สาย (เชียงราย)' },
            'ปาย': { lat: 19.3579, lon: 98.4409, name: 'ปาย (แม่ฮ่องสอน)' },
            'กาดสวนแก้ว': { lat: 18.8013, lon: 99.0015, name: 'เชียงใหม่' },
        };

        // ===== Fetch Real Solar Data from Open-Meteo =====
        async function fetchProvinceSolar(prov, ch, thinkBubble) {
            const systemKw = parseFloat(document.getElementById('kw').value) || 5;
            const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 4.5;
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${prov.lat}&longitude=${prov.lon}` +
                    `&current=shortwave_radiation,direct_radiation,cloud_cover,temperature_2m` +
                    `&daily=shortwave_radiation_sum,sunrise,sunset` +
                    `&timezone=Asia%2FBangkok&forecast_days=1`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('API error');
                const d = await res.json();

                const currIrr = Math.round(d.current?.shortwave_radiation ?? 0);      // W/m²
                const directIrr = Math.round(d.current?.direct_radiation ?? 0);          // W/m²
                const cloud = Math.round(d.current?.cloud_cover ?? 0);               // %
                const temp = (d.current?.temperature_2m ?? 0).toFixed(1);           // °C
                const dailyMJ = d.daily?.shortwave_radiation_sum?.[0] ?? 0;            // MJ/m²
                const dailyKwh = (dailyMJ / 3.6).toFixed(2);                            // kWh/m²/day
                const sunrise = d.daily?.sunrise?.[0]?.split('T')[1] ?? '--:--';
                const sunset = d.daily?.sunset?.[0]?.split('T')[1] ?? '--:--';

                // Production estimate: systemKw × daily_irr_kWh × PR(0.8) × temp_derating
                const tempDerating = Math.max(0.85, 1 - (Math.max(0, parseFloat(temp) - 25) * 0.004));
                const production = (systemKw * parseFloat(dailyKwh) * 0.8 * tempDerating).toFixed(1);
                const saving = Math.round(parseFloat(production) * unitPrice);

                // Irradiance quality label
                const irrLevel = currIrr > 600 ? '☀️ แสงแดดจัด' : currIrr > 300 ? '🌤️ แสงแดดปานกลาง' : currIrr > 50 ? '⛅ มีเมฆบางส่วน' : '☁️ เมฆมาก / กลางคืน';
                const cloudColor = cloud < 30 ? 'var(--green)' : cloud < 60 ? 'var(--accent)' : 'var(--pink)';

                const aiHtml = `
🛰️ <b>Solar Intelligence — ${prov.name}</b><br>
<span style="font-size:0.75rem;color:var(--muted);">📡 ข้อมูลสด จาก Open-Meteo · ${new Date().toLocaleTimeString('th-TH')}</span><br><br>
<b>☀️ ความเข้มแสงขณะนี้</b><br>
&nbsp;• รังสีรวม (GHI): <b style="color:var(--accent);">${currIrr} W/m²</b><br>
&nbsp;• รังสีตรง (DNI): <b style="color:#f59e0b;">${directIrr} W/m²</b><br>
&nbsp;• สภาพท้องฟ้า: <b>${irrLevel}</b><br>
&nbsp;• เมฆปกคลุม: <b style="color:${cloudColor};">${cloud}%</b><br>
&nbsp;• อุณหภูมิ: <b>${temp} °C</b><br><br>
<b>📊 การผลิตไฟวันนี้ (ระบบ ${systemKw} kW)</b><br>
&nbsp;• รังสีสะสมวันนี้: <b style="color:var(--primary);">${dailyKwh} kWh/m²</b><br>
&nbsp;• ผลิตไฟได้ประมาณ: <b style="color:var(--green);">${production} kWh</b><br>
&nbsp;• ประหยัดค่าไฟ: <b style="color:var(--green);">${saving.toLocaleString()} บาท</b><br>
&nbsp;• พระอาทิตย์ขึ้น/ตก: <b>${sunrise} – ${sunset}</b>`;

                ch.removeChild(thinkBubble);
                msgs.push({ role: 'ai', text: aiHtml }); renderChat();

            } catch (e) {
                ch.removeChild(thinkBubble);
                msgs.push({ role: 'ai', text: `⚠️ <b>ไม่สามารถดึงข้อมูลได้:</b><br>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้งครับ` });
                renderChat();
            }
        }

        // ===== Geocoding Fallback: อำเภอ / ตำบล / ทุกสถานที่ =====
        async function geocodeAndFetchSolar(locationName, ch, thinkBubble) {
            try {
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=5&language=th&format=json`;
                const geoRes = await fetch(geoUrl);
                if (!geoRes.ok) throw new Error('Geocoding API error');
                const geoData = await geoRes.json();

                if (!geoData.results || geoData.results.length === 0) {
                    ch.removeChild(thinkBubble);
                    msgs.push({ role: 'ai', text: `🔍 <b>ไม่พบสถานที่ "${locationName}"</b><br><br>ลองพิมพ์ใหม่ครับ เช่น:<br>• <b>บ้านโป่ง</b> (อำเภอในราชบุรี)<br>• <b>ลาดกระบัง</b> (เขตในกรุงเทพ)<br>• <b>หาดใหญ่</b> (อำเภอในสงขลา)` });
                    renderChat(); return;
                }

                // Prefer Thailand results
                const best = geoData.results.find(r => r.country_code === 'TH') || geoData.results[0];
                const isThailand = best.country_code === 'TH';

                // Build rich display name from geocoding metadata
                const parts = [best.name];
                if (best.admin3 && best.admin3 !== best.name) parts.push(best.admin3);
                if (best.admin2 && best.admin2 !== best.name) parts.push(best.admin2);
                if (best.admin1 && best.admin1 !== best.name) parts.push(best.admin1);
                if (!isThailand && best.country) parts.push(best.country);
                const displayName = parts.filter(Boolean).join(' › ');

                const prov = { lat: best.latitude, lon: best.longitude, name: displayName };
                await fetchProvinceSolar(prov, ch, thinkBubble);

            } catch (e) {
                ch.removeChild(thinkBubble);
                msgs.push({ role: 'ai', text: `⚠️ <b>เชื่อมต่อ Geocoding API ไม่ได้:</b><br>กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ครับ` });
                renderChat();
            }
        }

        function sendMsg(txt) {

            if (!txt) { txt = document.getElementById('chatInput').value.trim(); if (!txt) return; document.getElementById('chatInput').value = ''; }
            msgs.push({ role: 'user', text: txt }); renderChat();
            const ch = document.getElementById('chatHistory');
            const th = document.createElement('div'); th.className = 'bubble ai thinking';
            th.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
            ch.appendChild(th); ch.scrollTop = ch.scrollHeight;

            // ── Province & Location Solar Lookup (async, real-time API) ──
            const q = txt.toLowerCase();
            const intentKeywords = ['ค่าไฟ', 'แนะนำระบบ', 'แบตเตอรี่', 'แบต', 'ขนาดแผง', 'พื้นที่หลังคา', 'สเปก', 'คืนทุน', 'roi', 'กำไร', 'พยากรณ์', 'ทำนาย', 'พรุ่งนี้', 'ฝุ่น', 'บำรุงรักษา', 'ล้างแผง', 'ประสิทธิภาพ', 'ขายไฟ', 'net metering'];
            const hasIntent = intentKeywords.some(k => q.includes(k));

            // 1. Fast lookup: local province DB
            const foundKey = Object.keys(thaiProvinces).find(k => q.includes(k));
            if (foundKey) { fetchProvinceSolar(thaiProvinces[foundKey], ch, th); return; }

            // 2. Geocoding fallback: any district / subdistrict / location
            if (!hasIntent) { geocodeAndFetchSolar(txt.trim(), ch, th); return; }

            setTimeout(() => {
                ch.removeChild(th);
                let ai = '';
                if (q.includes('ค่าไฟ') || q.includes('แนะนำระบบ')) {
                    const nm = q.match(/\d+,?\d*/); let bill = 4500; if (nm) bill = parseInt(nm[0].replace(/,/g, ''));
                    const sz = Math.max(1, Math.round((bill / 800) * 10) / 10);
                    const pb = (5.5 - (sz * 0.04)).toFixed(1);
                    ai = `🔍 <b>AI วิเคราะห์:</b><br>จากค่าไฟ <b>${bill.toLocaleString()} บาท/เดือน</b> ระบบที่เหมาะสมคือ <b>${sz.toFixed(1)} kW</b><br>• แผงที่ต้องการ: <b>${Math.ceil(sz * 1000 / 800)} แผง (800W)</b><br>• คาดประหยัด: <b>${Math.round(bill * 0.65 * 12).toLocaleString()} บาท/ปี</b><br>• ระยะคืนทุน: <b>${pb} ปี</b>`;
                } else if (q.includes('แบตเตอรี่') || q.includes('แบต')) {
                    ai = `🔋 <b>AI แนะนำแบตเตอรี่:</b><br>ขนาดที่เหมาะสม = <b>1.25 × หน่วยไฟกลางคืน</b> (เพื่อป้องกัน DOD เกิน 80%)<br><br>ตัวอย่าง: ใช้ 8 หน่วย/คืน → แบต <b>10 kWh LFP</b><br>แนะนำ: <b>Tesla Powerwall, CATL LFP, Pylontech</b>`;
                } else if (q.includes('ขนาดแผง') || q.includes('พื้นที่หลังคา') || q.includes('สเปก')) {
                    ai = `📐 <b>AI Sizing &amp; Specs:</b><br>• แผงขนาดมาตรฐานที่แนะนำ: <b>800W</b> (High-Power Mono PERC / TOPCon)<br>• พื้นที่หลังคาต่อแผง: <b>~2.5 ตร.ม.</b><br>• ขนาดติดตั้งเฉลี่ยบ้านทั่วไป: <b>3 - 10 kW</b> (ใช้แผง 4 - 13 แผง)`;
                } else if (q.includes('คืนทุน') || q.includes('roi') || q.includes('กำไร')) {
                    const pb = document.getElementById('valPayback').textContent;
                    const np = document.getElementById('netProfit25').textContent;
                    ai = `📈 <b>ROI Analysis:</b><br>• ระยะคืนทุน: <b>${pb} ปี</b><br>• กำไรสะสมสุทธิ 25 ปี: <b>${np}</b><br><br>ข้อมูลจากการคำนวณปัจจุบันในระบบครับ`;
                } else if (q.includes('พยากรณ์') || q.includes('ทำนาย') || q.includes('พรุ่งนี้')) {
                    const kw = parseFloat(document.getElementById('kw').value) || 5;
                    const pred = (kw * 4.5 * 0.8).toFixed(1);
                    const sv = (pred * parseFloat(document.getElementById('unitPrice').value)).toFixed(0);
                    ai = `🔮 <b>AI พยากรณ์วันพรุ่งนี้:</b><br>• ท้องฟ้าแจ่มใส คาดรังสี <b>4.5 kWh/m²/วัน</b><br>• ผลิตได้ประมาณ <b>${pred} kWh</b><br>• ประหยัดค่าไฟ: <b>${parseInt(sv).toLocaleString()} บาท</b><br><br>ดูรายสัปดาห์ได้ที่หน้า <b>AI พยากรณ์</b> ครับ!`;
                } else if (q.includes('ฝุ่น') || q.includes('บำรุงรักษา') || q.includes('ล้างแผง') || q.includes('ประสิทธิภาพ')) {
                    ai = `🔧 <b>AI Predictive Maintenance:</b><br>• ระบบทำนายประสิทธิภาพลดลงจากฝุ่นและละอองสภาพอากาศ<br>• สามารถตรวจสอบค่า <b>ประสิทธิภาพระบบแผง (AI Predict)</b> ได้แบบเรียลไทม์<br>• แนะนำให้กดปุ่ม <b>"AI Re-optimize"</b> เพื่อจำลองการทำความสะอาดและกู้ประสิทธิภาพการผลิตกลับมาเป็น 100.0%`;
                } else if (q.includes('ขายไฟ') || q.includes('net metering')) {
                    ai = `💡 <b>โซลาร์ภาคประชาชน:</b><br>รัฐรับซื้อไฟส่วนเกินที่ <b>2.20 บาท/หน่วย</b> เป็นเวลา 10 ปี<br><br>เปิดใช้งานได้ที่แดชบอร์ด → เลือก <b>"ขายไฟคืนภาครัฐ"</b> แล้วปรับสัดส่วนการใช้ไฟเองครับ!`;
                } else {
                    ai = `🤖 ผมสามารถตอบได้เกี่ยวกับ:<br>• 📍 <b>พิมพ์ชื่ออำเภอ / ตำบล / จังหวัด</b> → ดูความเข้มแสงและผลิตไฟ Real-Time<br>• <b>ค่าไฟ</b> → แนะนำขนาดระบบ<br>• <b>แบตเตอรี่</b> → คำนวณขนาดที่เหมาะสม<br>• <b>ขนาดแผง/พื้นที่</b> → ออกแบบสเปก<br>• <b>ROI/คืนทุน</b> → วิเคราะห์การเงิน<br>• <b>พยากรณ์</b> → คาดการณ์การผลิตไฟ`;
                }
                msgs.push({ role: 'ai', text: ai }); renderChat();
            }, 1100);
        }
        function renderChat() {
            const ch = document.getElementById('chatHistory'); ch.innerHTML = '';
            msgs.forEach(m => { const b = document.createElement('div'); b.className = 'bubble ' + m.role; b.innerHTML = m.text; ch.appendChild(b); });
            ch.scrollTop = ch.scrollHeight;
        }

        // ============================= SQL =============================
        function runSQL() {
            const sql = document.getElementById('sqlQueryInput').value.trim().toLowerCase().replace(/;$/, '');
            const out = document.getElementById('sqlResult');
            if (sql.includes('select * from users')) renderTable(mockDB.users);
            else if (sql.includes('select * from estimates_log')) renderTable(mockDB.estimates_log);
            else if (sql.includes('select * from comparison_data')) renderTable(mockDB.comparison_data);
            else out.innerHTML = '<span class="sql-error">คำสั่งไม่รู้จัก ลอง: SELECT * FROM estimates_log;</span>';
        }
        function renderTable(arr) {
            const out = document.getElementById('sqlResult');
            if (!arr || !arr.length) { out.innerHTML = '<p style="color:#94a3b8">Empty set</p>'; return; }
            const h = Object.keys(arr[0]);
            let html = `<p style="color:var(--green);margin-bottom:6px;font-size:0.78rem;">Query OK — ${arr.length} rows returned.</p><table class="sql-table"><thead><tr>`;
            h.forEach(k => html += `<th>${k}</th>`);
            html += '</tr></thead><tbody>';
            arr.forEach(r => { html += '<tr>'; h.forEach(k => html += `<td>${r[k] ?? 'NULL'}</td>`); html += '</tr>'; });
            html += '</tbody></table>';
            out.innerHTML = html;
        }

        // ============================= PDF =============================
        function downloadReport() {
            const kw = parseFloat(document.getElementById('kw').value) || 0;
            document.getElementById('pdfDate').textContent = new Date().toLocaleString('th-TH');
            document.getElementById('pdfLat').textContent = lat.toFixed(4);
            document.getElementById('pdfLng').textContent = lon.toFixed(4);
            document.getElementById('pdfRadiation').textContent = document.getElementById('valRadiation').textContent + ' kWh/m²/วัน';
            document.getElementById('pdfSize').textContent = kw.toFixed(1) + ' kW';
            document.getElementById('pdfDaily').textContent = document.getElementById('valDaily').textContent + ' kWh';
            document.getElementById('pdfYearly').textContent = document.getElementById('valYearly').textContent + ' kWh';
            document.getElementById('pdfSaving').textContent = document.getElementById('valSaving').textContent + ' บาท/ปี';
            document.getElementById('pdfInvestment').textContent = parseFloat(document.getElementById('price').value).toLocaleString() + ' บาท';
            document.getElementById('pdfPayback').textContent = document.getElementById('valPayback').textContent + ' ปี';
            document.getElementById('pdfNetProfit').textContent = document.getElementById('netProfit25').textContent;
            document.getElementById('pdfY1').textContent = document.getElementById('roiYear1').textContent;
            document.getElementById('pdfY5').textContent = document.getElementById('roiYear5').textContent;
            document.getElementById('pdfY10').textContent = document.getElementById('roiYear10').textContent;
            document.getElementById('pdfY25').textContent = document.getElementById('roiYear25').textContent;
            const el = document.getElementById('pdfTemplate'); el.style.display = 'block';
            html2pdf().from(el).set({ margin: 12, filename: `SolarAI_Report_${lat.toFixed(4)}_${lon.toFixed(4)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save().then(() => { el.style.display = 'none'; });
        }

        // ============================= INIT =============================
        recommendBat();
        renderChat();
        updateSliderFill('timeSlider', 6, 18);
        updateSliderFill('kw', 1, 20);
