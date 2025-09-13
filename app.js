(function () {
	// Simple SPA Router and State using localStorage
	const app = document.getElementById('app');
	const nav = document.getElementById('nav');
	const logoutBtn = document.getElementById('logoutBtn');

	const STORAGE_KEYS = {
		users: 'spa_users',
		session: 'spa_session',
		groups: 'spa_groups',
		exams: 'spa_exams',
		results: 'spa_results',
		ai: 'spa_ai'
	};

	function getStore(key, fallback) {
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : (fallback ?? null);
		} catch (_) { return fallback ?? null; }
	}
	function setStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

	// Seed data if empty
	if (!getStore(STORAGE_KEYS.users)) setStore(STORAGE_KEYS.users, []);
	if (!getStore(STORAGE_KEYS.groups)) setStore(STORAGE_KEYS.groups, []);
	if (!getStore(STORAGE_KEYS.exams)) setStore(STORAGE_KEYS.exams, []);
	if (!getStore(STORAGE_KEYS.results)) setStore(STORAGE_KEYS.results, []);
	if (!getStore(STORAGE_KEYS.ai)) setStore(STORAGE_KEYS.ai, { openaiKey: '' });

	function currentUser() {
		const session = getStore(STORAGE_KEYS.session);
		if (!session) return null;
		const users = getStore(STORAGE_KEYS.users, []);
		return users.find(u => u.id === session.userId) || null;
	}

	function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

	function navigate(route) {
		window.location.hash = '#' + route;
	}

	function updateNavAuthState() {
		const isAuthed = !!currentUser();
		Array.from(document.querySelectorAll('.authed-only')).forEach(el => {
			el.classList.toggle('hidden', !isAuthed);
		});
		document.getElementById('nav-login').classList.toggle('hidden', isAuthed);
		document.getElementById('nav-signup').classList.toggle('hidden', isAuthed);
	}

	function pageHome() {
		app.innerHTML = `
			<section class="panel">
				<h2>Chào mừng đến với Học 12</h2>
				<p class="muted">Nền tảng tự học và luyện đề cho học sinh lớp 12.</p>
				<div class="spacer"></div>
				<div class="card">
					<p>Hãy sử dụng thanh điều hướng phía trên để: đăng nhập/tạo tài khoản, vào mục nhóm, mở kiến thức Toán/Lý, tạo đề, hoặc xem bảng thành tích.</p>
				</div>
			</section>
		`;
	}

	function pageLogin() {
		if (currentUser()) { navigate('home'); return; }
		app.innerHTML = `
			<section class="panel" style="max-width:520px;margin:auto;">
				<h2>Đăng nhập</h2>
				<form id="loginForm">
					<div class="row">
						<label>Email</label>
						<input type="email" name="email" required />
					</div>
					<div class="row">
						<label>Mật khẩu</label>
						<input type="password" name="password" required minlength="4" />
					</div>
					<button class="btn" type="submit">Đăng nhập</button>
				</form>
			</section>
		`;
		document.getElementById('loginForm').addEventListener('submit', (e) => {
			e.preventDefault();
			const data = new FormData(e.target);
			const email = String(data.get('email')).trim().toLowerCase();
			const password = String(data.get('password'));
			const users = getStore(STORAGE_KEYS.users, []);
			const user = users.find(u => u.email === email && u.password === password);
			if (!user) { alert('Sai email hoặc mật khẩu'); return; }
			setStore(STORAGE_KEYS.session, { userId: user.id, at: Date.now() });
			updateNavAuthState();
			navigate('home');
		});
	}

	function pageSignup() {
		if (currentUser()) { navigate('home'); return; }
		app.innerHTML = `
			<section class="panel" style="max-width:520px;margin:auto;">
				<h2>Tạo tài khoản</h2>
				<form id="signupForm">
					<div class="row">
						<label>Họ tên</label>
						<input name="name" required />
					</div>
					<div class="row">
						<label>Email</label>
						<input type="email" name="email" required />
					</div>
					<div class="row">
						<label>Mật khẩu</label>
						<input type="password" name="password" required minlength="4" />
					</div>
					<button class="btn" type="submit">Đăng ký</button>
				</form>
			</section>
		`;
		document.getElementById('signupForm').addEventListener('submit', (e) => {
			e.preventDefault();
			const data = new FormData(e.target);
			const name = String(data.get('name')).trim();
			const email = String(data.get('email')).trim().toLowerCase();
			const password = String(data.get('password'));
			const users = getStore(STORAGE_KEYS.users, []);
			if (users.some(u => u.email === email)) { alert('Email đã tồn tại'); return; }
			const newUser = { id: uid(), name, email, password, createdAt: Date.now() };
			users.push(newUser); setStore(STORAGE_KEYS.users, users);
			setStore(STORAGE_KEYS.session, { userId: newUser.id, at: Date.now() });
			updateNavAuthState();
			navigate('home');
		});
	}

	function pageGroups() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const groups = getStore(STORAGE_KEYS.groups, []);
		app.innerHTML = `
			<section class="panel">
				<div class="flex">
					<h2>Nhóm</h2>
					<span class="right"></span>
					<button class="btn" id="btnNewGroup">Tạo nhóm</button>
				</div>
				<div class="spacer"></div>
				<div id="groupsList" class="grid cols-2"></div>
			</section>
		`;
		function render() {
			const list = document.getElementById('groupsList');
			const mineOrAll = groups.filter(g => g.members.includes(user.id));
			list.innerHTML = mineOrAll.map(g => `
				<div class="card">
					<h4>${g.name}</h4>
					<p class="muted">Thành viên: ${g.members.length}</p>
				</div>
			`).join('');
		}
		render();
		document.getElementById('btnNewGroup').addEventListener('click', () => {
			const name = prompt('Tên nhóm?');
			if (!name) return;
			const g = { id: uid(), name: name.trim(), ownerId: user.id, members: [user.id], createdAt: Date.now() };
			groups.push(g); setStore(STORAGE_KEYS.groups, groups); render();
		});
	}

	function renderAccordion(targetId, sections) {
		const host = document.getElementById(targetId);
		host.innerHTML = sections.map((s, idx) => `
			<div class="accordion-item" data-idx="${idx}">
				<button class="accordion-header">
					<span>${s.title}</span>
					<span class="chevron">▶</span>
				</button>
				<div class="accordion-content"><div>${s.content}</div></div>
			</div>
		`).join('');
		host.querySelectorAll('.accordion-item').forEach(item => {
			const header = item.querySelector('.accordion-header');
			const content = item.querySelector('.accordion-content');
			header.addEventListener('click', () => {
				const isOpen = item.classList.toggle('open');
				content.style.maxHeight = isOpen ? content.scrollHeight + 'px' : '0px';
			});
		});
	}

	function pageMath() {
		app.innerHTML = `
			<section class="panel">
				<h2>Kiến thức Toán 12</h2>
				<div id="mathAccordion" class="accordion"></div>
			</section>
		`;
		const sections = [
			{ 
				title: '1. Ứng dụng đạo hàm', 
				content: `
					<h4>Đạo hàm cơ bản:</h4>
					<ul>
						<li>(x^n)' = n.x^(n-1)</li>
						<li>(√x)' = 1/(2√x)</li>
						<li>(1/x)' = -1/x²</li>
						<li>(sin x)' = cos x</li>
						<li>(cos x)' = -sin x</li>
						<li>(tan x)' = 1/cos²x</li>
						<li>(e^x)' = e^x</li>
						<li>(ln x)' = 1/x</li>
					</ul>
					<h4>Quy tắc đạo hàm:</h4>
					<ul>
						<li>(u ± v)' = u' ± v'</li>
						<li>(u.v)' = u'.v + u.v'</li>
						<li>(u/v)' = (u'.v - u.v')/v²</li>
						<li>(u^n)' = n.u^(n-1).u'</li>
					</ul>
					<h4>Ứng dụng:</h4>
					<ul>
						<li>Khảo sát sự biến thiên</li>
						<li>Tìm cực trị</li>
						<li>Tiệm cận</li>
						<li>Vẽ đồ thị</li>
					</ul>
				`
			},
			{ 
				title: '2. Hàm số lũy thừa, mũ, logarit', 
				content: `
					<h4>Hàm số lũy thừa:</h4>
					<ul>
						<li>y = x^α (α ∈ ℝ)</li>
						<li>Đạo hàm: (x^α)' = α.x^(α-1)</li>
					</ul>
					<h4>Hàm số mũ:</h4>
					<ul>
						<li>y = a^x (a > 0, a ≠ 1)</li>
						<li>Đạo hàm: (a^x)' = a^x.ln a</li>
						<li>Đặc biệt: (e^x)' = e^x</li>
					</ul>
					<h4>Hàm số logarit:</h4>
					<ul>
						<li>y = log_a(x) (a > 0, a ≠ 1)</li>
						<li>Đạo hàm: (log_a x)' = 1/(x.ln a)</li>
						<li>Đặc biệt: (ln x)' = 1/x</li>
					</ul>
					<h4>Tính chất:</h4>
					<ul>
						<li>a^x.a^y = a^(x+y)</li>
						<li>a^x/a^y = a^(x-y)</li>
						<li>(a^x)^y = a^(xy)</li>
						<li>log_a(xy) = log_a(x) + log_a(y)</li>
						<li>log_a(x/y) = log_a(x) - log_a(y)</li>
						<li>log_a(x^y) = y.log_a(x)</li>
					</ul>
				`
			},
			{ 
				title: '3. Nguyên hàm và tích phân', 
				content: `
					<h4>Nguyên hàm cơ bản:</h4>
					<ul>
						<li>∫x^n dx = x^(n+1)/(n+1) + C (n ≠ -1)</li>
						<li>∫1/x dx = ln|x| + C</li>
						<li>∫e^x dx = e^x + C</li>
						<li>∫a^x dx = a^x/ln a + C</li>
						<li>∫sin x dx = -cos x + C</li>
						<li>∫cos x dx = sin x + C</li>
						<li>∫1/cos²x dx = tan x + C</li>
						<li>∫1/sin²x dx = -cot x + C</li>
					</ul>
					<h4>Tính chất nguyên hàm:</h4>
					<ul>
						<li>∫[f(x) ± g(x)]dx = ∫f(x)dx ± ∫g(x)dx</li>
						<li>∫k.f(x)dx = k.∫f(x)dx</li>
					</ul>
					<h4>Tích phân xác định:</h4>
					<ul>
						<li>∫[a→b] f(x)dx = F(b) - F(a)</li>
						<li>∫[a→b] f(x)dx = -∫[b→a] f(x)dx</li>
						<li>∫[a→c] f(x)dx = ∫[a→b] f(x)dx + ∫[b→c] f(x)dx</li>
					</ul>
					<h4>Ứng dụng tích phân:</h4>
					<ul>
						<li>Diện tích hình phẳng</li>
						<li>Thể tích khối tròn xoay</li>
					</ul>
				`
			},
			{ 
				title: '4. Số phức', 
				content: `
					<h4>Định nghĩa:</h4>
					<ul>
						<li>z = a + bi (a, b ∈ ℝ, i² = -1)</li>
						<li>a: phần thực, b: phần ảo</li>
					</ul>
					<h4>Dạng lượng giác:</h4>
					<ul>
						<li>z = r(cos φ + i.sin φ)</li>
						<li>r = |z| = √(a² + b²)</li>
						<li>φ = arg(z)</li>
					</ul>
					<h4>Phép toán:</h4>
					<ul>
						<li>(a + bi) + (c + di) = (a + c) + (b + d)i</li>
						<li>(a + bi) - (c + di) = (a - c) + (b - d)i</li>
						<li>(a + bi)(c + di) = (ac - bd) + (ad + bc)i</li>
						<li>(a + bi)/(c + di) = [(ac + bd) + (bc - ad)i]/(c² + d²)</li>
					</ul>
					<h4>Công thức Moivre:</h4>
					<ul>
						<li>[r(cos φ + i.sin φ)]^n = r^n(cos nφ + i.sin nφ)</li>
					</ul>
				`
			},
			{ 
				title: '5. Khối đa diện và thể tích', 
				content: `
					<h4>Khối chóp:</h4>
					<ul>
						<li>V = (1/3).S.h</li>
						<li>S: diện tích đáy, h: chiều cao</li>
					</ul>
					<h4>Khối lăng trụ:</h4>
					<ul>
						<li>V = S.h</li>
						<li>S: diện tích đáy, h: chiều cao</li>
					</ul>
					<h4>Khối nón:</h4>
					<ul>
						<li>V = (1/3).π.r².h</li>
						<li>Sxq = π.r.l</li>
						<li>Stp = π.r(r + l)</li>
					</ul>
					<h4>Khối trụ:</h4>
					<ul>
						<li>V = π.r².h</li>
						<li>Sxq = 2π.r.h</li>
						<li>Stp = 2π.r(r + h)</li>
					</ul>
					<h4>Khối cầu:</h4>
					<ul>
						<li>V = (4/3).π.r³</li>
						<li>S = 4π.r²</li>
					</ul>
				`
			},
			{ 
				title: '6. Phương pháp tọa độ trong không gian', 
				content: `
					<h4>Tọa độ vectơ:</h4>
					<ul>
						<li>u⃗ = (x, y, z)</li>
						<li>|u⃗| = √(x² + y² + z²)</li>
						<li>u⃗ + v⃗ = (x₁ + x₂, y₁ + y₂, z₁ + z₂)</li>
						<li>k.u⃗ = (kx, ky, kz)</li>
						<li>u⃗.v⃗ = x₁x₂ + y₁y₂ + z₁z₂</li>
					</ul>
					<h4>Phương trình mặt phẳng:</h4>
					<ul>
						<li>Ax + By + Cz + D = 0</li>
						<li>n⃗ = (A, B, C): vectơ pháp tuyến</li>
					</ul>
					<h4>Phương trình đường thẳng:</h4>
					<ul>
						<li>Tham số: x = x₀ + at, y = y₀ + bt, z = z₀ + ct</li>
						<li>Chính tắc: (x - x₀)/a = (y - y₀)/b = (z - z₀)/c</li>
					</ul>
					<h4>Phương trình mặt cầu:</h4>
					<ul>
						<li>(x - a)² + (y - b)² + (z - c)² = r²</li>
						<li>Tâm I(a, b, c), bán kính r</li>
					</ul>
				`
			}
		];
		renderAccordion('mathAccordion', sections);
	}

	function pagePhysics() {
		app.innerHTML = `
			<section class="panel">
				<h2>Kiến thức Vật lý 12</h2>
				<div id="physAccordion" class="accordion"></div>
			</section>
		`;
		const sections = [
			{ 
				title: '1. Dao động cơ', 
				content: `
					<h4>Dao động điều hòa:</h4>
					<ul>
						<li>x = A.cos(ωt + φ)</li>
						<li>v = -ωA.sin(ωt + φ)</li>
						<li>a = -ω²A.cos(ωt + φ) = -ω²x</li>
						<li>ω = 2π/T = 2πf</li>
						<li>A = x_max, φ: pha ban đầu</li>
					</ul>
					<h4>Con lắc lò xo:</h4>
					<ul>
						<li>T = 2π√(m/k)</li>
						<li>f = 1/T = (1/2π)√(k/m)</li>
						<li>ω = √(k/m)</li>
						<li>W = (1/2)kA² = (1/2)mv² + (1/2)kx²</li>
					</ul>
					<h4>Con lắc đơn:</h4>
					<ul>
						<li>T = 2π√(l/g)</li>
						<li>f = (1/2π)√(g/l)</li>
						<li>ω = √(g/l)</li>
						<li>s = s₀.cos(ωt + φ)</li>
					</ul>
					<h4>Dao động tắt dần:</h4>
					<ul>
						<li>x = A₀.e^(-γt).cos(ωt + φ)</li>
						<li>γ = b/(2m): hệ số tắt dần</li>
					</ul>
				`
			},
			{ 
				title: '2. Sóng cơ và sóng âm', 
				content: `
					<h4>Sóng cơ:</h4>
					<ul>
						<li>u = A.cos(ωt - kx + φ)</li>
						<li>k = 2π/λ: số sóng</li>
						<li>v = λf = λ/T</li>
						<li>v = √(F/μ) (dây đàn hồi)</li>
					</ul>
					<h4>Giao thoa sóng:</h4>
					<ul>
						<li>Δφ = 2πd/λ</li>
						<li>Cực đại: d = kλ (k ∈ ℤ)</li>
						<li>Cực tiểu: d = (k + 1/2)λ</li>
					</ul>
					<h4>Sóng dừng:</h4>
					<ul>
						<li>λ = 2l/n (n: số bụng)</li>
						<li>f = nv/(2l)</li>
						<li>Nút: u = 0, Bụng: u = ±A</li>
					</ul>
					<h4>Sóng âm:</h4>
					<ul>
						<li>I = P/(4πr²)</li>
						<li>L = 10.log(I/I₀) (dB)</li>
						<li>f' = f(v ± v₀)/(v ∓ v_s)</li>
					</ul>
				`
			},
			{ 
				title: '3. Dòng điện xoay chiều', 
				content: `
					<h4>Đại cương:</h4>
					<ul>
						<li>i = I₀.cos(ωt + φ)</li>
						<li>u = U₀.cos(ωt + φ)</li>
						<li>I = I₀/√2, U = U₀/√2</li>
					</ul>
					<h4>Mạch RLC:</h4>
					<ul>
						<li>Z = √(R² + (Z_L - Z_C)²)</li>
						<li>Z_L = ωL, Z_C = 1/(ωC)</li>
						<li>I = U/Z</li>
						<li>cos φ = R/Z</li>
					</ul>
					<h4>Công suất:</h4>
					<ul>
						<li>P = UI.cos φ = I²R</li>
						<li>Q = UI.sin φ</li>
						<li>S = UI = √(P² + Q²)</li>
					</ul>
					<h4>Cộng hưởng:</h4>
					<ul>
						<li>ω₀ = 1/√(LC)</li>
						<li>f₀ = 1/(2π√(LC))</li>
						<li>Z = R (min), I = U/R (max)</li>
					</ul>
				`
			},
			{ 
				title: '4. Dao động và sóng điện từ', 
				content: `
					<h4>Mạch LC:</h4>
					<ul>
						<li>q = Q₀.cos(ωt + φ)</li>
						<li>i = -ωQ₀.sin(ωt + φ)</li>
						<li>ω = 1/√(LC)</li>
						<li>W = (1/2)LI² + (1/2)q²/C</li>
					</ul>
					<h4>Sóng điện từ:</h4>
					<ul>
						<li>c = 1/√(ε₀μ₀) = 3.10⁸ m/s</li>
						<li>λ = c/f = cT</li>
						<li>E = E₀.cos(ωt - kx)</li>
						<li>B = B₀.cos(ωt - kx)</li>
					</ul>
					<h4>Truyền thông:</h4>
					<ul>
						<li>f = 1/(2π√(LC))</li>
						<li>λ = c/f</li>
						<li>Anten: λ/4, λ/2</li>
					</ul>
				`
			},
			{ 
				title: '5. Sóng ánh sáng', 
				content: `
					<h4>Giao thoa ánh sáng:</h4>
					<ul>
						<li>Δd = d₂ - d₁</li>
						<li>Cực đại: Δd = kλ</li>
						<li>Cực tiểu: Δd = (k + 1/2)λ</li>
						<li>i = λD/a (khoảng vân)</li>
					</ul>
					<h4>Nhiễu xạ:</h4>
					<ul>
						<li>a.sin θ = kλ</li>
						<li>D = 2.44λ/a (đĩa tròn)</li>
					</ul>
					<h4>Quang phổ:</h4>
					<ul>
						<li>d.sin θ = kλ</li>
						<li>Δλ = λ²/(2d.cos θ)</li>
					</ul>
					<h4>Tán sắc:</h4>
					<ul>
						<li>n = c/v</li>
						<li>n = sin i/sin r</li>
						<li>D = (n - 1)A (lăng kính)</li>
					</ul>
				`
			},
			{ 
				title: '6. Lượng tử ánh sáng', 
				content: `
					<h4>Hiệu ứng quang điện:</h4>
					<ul>
						<li>ε = hf = hc/λ</li>
						<li>W₀ = hf₀ = hc/λ₀</li>
						<li>ε = W₀ + W_đmax</li>
						<li>W_đmax = (1/2)mv²max</li>
					</ul>
					<h4>Bức xạ nhiệt:</h4>
					<ul>
						<li>M = σT⁴ (Stefan-Boltzmann)</li>
						<li>λ_max = b/T (Wien)</li>
						<li>σ = 5.67×10⁻⁸ W/m²K⁴</li>
					</ul>
					<h4>Mẫu nguyên tử Bohr:</h4>
					<ul>
						<li>r_n = n²r₁</li>
						<li>E_n = -13.6/n² eV</li>
						<li>hf = E_m - E_n</li>
					</ul>
				`
			},
			{ 
				title: '7. Hạt nhân nguyên tử', 
				content: `
					<h4>Cấu tạo hạt nhân:</h4>
					<ul>
						<li>Z: số proton, N: số neutron</li>
						<li>A = Z + N: số khối</li>
						<li>m = Z.m_p + N.m_n - Δm</li>
					</ul>
					<h4>Năng lượng liên kết:</h4>
					<ul>
						<li>E_lk = Δm.c²</li>
						<li>ε = E_lk/A</li>
						<li>Δm = Zm_p + Nm_n - m</li>
					</ul>
					<h4>Phóng xạ:</h4>
					<ul>
						<li>N = N₀.e^(-λt)</li>
						<li>T = ln2/λ</li>
						<li>H = λN = H₀.e^(-λt)</li>
					</ul>
					<h4>Phản ứng hạt nhân:</h4>
					<ul>
						<li>Q = (m_trước - m_sau).c²</li>
						<li>Q > 0: tỏa năng lượng</li>
						<li>Q < 0: thu năng lượng</li>
					</ul>
				`
			},
			{ 
				title: '8. Từ vi mô đến vĩ mô', 
				content: `
					<h4>Các hạt cơ bản:</h4>
					<ul>
						<li>Lepton: e, μ, τ, ν</li>
						<li>Quark: u, d, s, c, b, t</li>
						<li>Boson: γ, W, Z, H</li>
					</ul>
					<h4>Thuyết tương đối:</h4>
					<ul>
						<li>E = mc²</li>
						<li>E² = (pc)² + (mc²)²</li>
						<li>Δt = γΔt₀</li>
					</ul>
					<h4>Vũ trụ học:</h4>
					<ul>
						<li>v = H₀.d (Hubble)</li>
						<li>H₀ ≈ 70 km/s/Mpc</li>
						<li>Tuổi vũ trụ ≈ 13.8 tỷ năm</li>
					</ul>
				`
			}
		];
		renderAccordion('physAccordion', sections);
	}

	function pageExams() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const exams = getStore(STORAGE_KEYS.exams, []);
		app.innerHTML = `
			<section class="panel">
				<div class="flex">
					<h2>Tạo đề</h2>
					<span class="right"></span>
					<button class="btn" id="btnNewExam">Tạo đề thủ công</button>
					<button class="btn success" id="btnAiExam">Đề bởi ChatGPT</button>
				</div>
				<div class="spacer"></div>
				<div id="examList" class="grid cols-2"></div>
			</section>
		`;
		function render() {
			const list = document.getElementById('examList');
			const mine = exams.filter(e => e.ownerId === user.id);
			list.innerHTML = mine.map(ex => `
				<div class="card">
					<h4>${ex.title}</h4>
					<p class="muted">Câu hỏi: ${ex.questions.length}</p>
					<div class="flex">
						<button class="btn secondary" data-take="${ex.id}">Làm đề</button>
					</div>
				</div>
			`).join('');
			list.querySelectorAll('[data-take]').forEach(b => b.addEventListener('click', () => takeExam(b.getAttribute('data-take'))));
		}
		render();
		document.getElementById('btnNewExam').addEventListener('click', () => {
			const title = prompt('Tiêu đề đề thi?');
			if (!title) return;
			const questions = [];
			let addMore = true;
			while (addMore) {
				const q = prompt('Nhập câu hỏi (bỏ trống để dừng)');
				if (!q) break;
				const a = prompt('Đáp án A');
				const b = prompt('Đáp án B');
				const c = prompt('Đáp án C');
				const d = prompt('Đáp án D');
				const correct = prompt('Đáp án đúng (A/B/C/D)');
				questions.push({ id: uid(), text: q, options: { A: a, B: b, C: c, D: d }, correct: (correct||'').toUpperCase() });
				addMore = confirm('Thêm câu hỏi nữa?');
			}
			exams.push({ id: uid(), title: title.trim(), ownerId: user.id, questions, createdAt: Date.now() });
			setStore(STORAGE_KEYS.exams, exams); render();
		});

		document.getElementById('btnAiExam').addEventListener('click', async () => {
			const ai = getStore(STORAGE_KEYS.ai, { openaiKey: '' });
			if (!ai.openaiKey) { alert('Vào mục AI để nhập OpenAI API key trước.'); return; }
			const subject = prompt('Môn (Toán/Lý)?', 'Toán'); if (!subject) return;
			const level = '12';
			const topic = prompt('Chủ đề (ví dụ: đạo hàm, điện trường,...)', 'đạo hàm'); if (!topic) return;
			const countStr = prompt('Số câu hỏi?', '5') || '5';
			const num = Math.max(1, Math.min(20, parseInt(countStr, 10) || 5));
			const title = `Đề ${subject} lớp ${level} - ${topic}`;
			try {
				const quiz = await generateQuizWithOpenAI({ key: ai.openaiKey, subject, level, topic, num });
				if (!quiz || !Array.isArray(quiz.questions)) { alert('Không tạo được đề.'); return; }
				exams.push({ id: uid(), title, ownerId: user.id, questions: quiz.questions.map(q => ({ id: uid(), text: q.text, options: q.options, correct: q.answer })), createdAt: Date.now() });
				setStore(STORAGE_KEYS.exams, exams); alert('Đã tạo đề bởi ChatGPT'); render();
			} catch (err) {
				console.error(err);
				alert('Lỗi khi gọi OpenAI. Kiểm tra API key và kết nối mạng.');
			}
		});

		function takeExam(examId) {
			const exam = exams.find(e => e.id === examId); if (!exam) return;
			let score = 0; const answers = [];
			exam.questions.forEach((q, i) => {
				const ans = prompt(`Câu ${i+1}: ${q.text}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\nTrả lời (A/B/C/D)`);
				const pick = (ans||'').toUpperCase();
				answers.push({ qid: q.id, pick });
				if (pick === q.correct) score++;
			});
			const results = getStore(STORAGE_KEYS.results, []);
			results.push({ id: uid(), examId: exam.id, userId: user.id, score, total: exam.questions.length, at: Date.now() });
			setStore(STORAGE_KEYS.results, results);
			alert(`Điểm: ${score}/${exam.questions.length}`);
		}
	}

	async function generateQuizWithOpenAI({ key, subject, level, topic, num }) {
		const system = 'Bạn là trợ lý học tập. Hãy tạo đề trắc nghiệm JSON đúng cú pháp.';
		const user = `Tạo ${num} câu trắc nghiệm ${subject} lớp ${level} về chủ đề ${topic}. Yêu cầu JSON thuần không giải thích, theo cấu trúc: {"questions":[{"text":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A|B|C|D"}]}`;
		const body = {
			model: 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			temperature: 0.4
		};
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new Error('OpenAI HTTP ' + res.status);
		const data = await res.json();
		const content = data.choices?.[0]?.message?.content || '';
		// Try to extract JSON
		let jsonText = content.trim();
		const codeBlockMatch = jsonText.match(/```json[\s\S]*?```|```[\s\S]*?```/i);
		if (codeBlockMatch) jsonText = codeBlockMatch[0].replace(/```json|```/g, '').trim();
		return JSON.parse(jsonText);
	}

	function pageResults() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const exams = getStore(STORAGE_KEYS.exams, []);
		const results = getStore(STORAGE_KEYS.results, []);
		const myResults = results.filter(r => r.userId === user.id).sort((a,b)=>b.at-a.at);
		const leaderboard = aggregateLeaderboard(results, exams);
		app.innerHTML = `
			<section class="panel">
				<h2>Bảng thành tích</h2>
				<div class="grid cols-2">
					<div>
						<h3>Kết quả của tôi</h3>
						<table class="table">
							<thead><tr><th>Đề</th><th>Điểm</th><th>Thời gian</th></tr></thead>
							<tbody>
								${myResults.map(r => `
									<tr><td>${(exams.find(e=>e.id===r.examId)||{}).title||'Đã xóa'}</td><td>${r.score}/${r.total}</td><td>${new Date(r.at).toLocaleString('vi-VN')}</td></tr>
								`).join('')}
							</tbody>
						</table>
					</div>
					<div>
						<h3>Bảng xếp hạng</h3>
						<table class="table">
							<thead><tr><th>Email</th><th>Điểm TB</th><th>Lần làm</th></tr></thead>
							<tbody>
								${leaderboard.map(row => `
									<tr><td>${row.email}</td><td>${row.avg.toFixed(2)}</td><td>${row.count}</td></tr>
								`).join('')}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		`;
	}

	function pageAI() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const ai = getStore(STORAGE_KEYS.ai, { openaiKey: '' });
		app.innerHTML = `
			<section class="panel" style="max-width:640px;margin:auto;">
				<h2>Cài đặt AI</h2>
				<p class="muted">Nhập OpenAI API key để tạo đề bằng ChatGPT. Lưu ý: key được lưu trong trình duyệt của bạn.</p>
				<form id="aiForm">
					<div class="row">
						<label>OpenAI API Key</label>
						<input name="key" type="password" placeholder="sk-..." value="${ai.openaiKey ? '********' : ''}" />
					</div>
					<button class="btn" type="submit">Lưu</button>
					<button class="btn danger" type="button" id="clearKey">Xóa key</button>
				</form>
			</section>
		`;
		document.getElementById('aiForm').addEventListener('submit', (e) => {
			e.preventDefault();
			const data = new FormData(e.target);
			const key = String(data.get('key')||'').trim();
			if (!key) { alert('Vui lòng nhập key'); return; }
			setStore(STORAGE_KEYS.ai, { openaiKey: key });
			alert('Đã lưu API key');
		});
		document.getElementById('clearKey').addEventListener('click', () => {
			setStore(STORAGE_KEYS.ai, { openaiKey: '' });
			alert('Đã xóa key');
			navigate('home');
		});
	}

	function aggregateLeaderboard(results, exams) {
		const users = getStore(STORAGE_KEYS.users, []);
		const map = new Map();
		for (const r of results) {
			const user = users.find(u => u.id === r.userId); if (!user) continue;
			const ratio = r.total > 0 ? r.score / r.total : 0;
			const prev = map.get(user.email) || { sum: 0, count: 0 };
			map.set(user.email, { sum: prev.sum + ratio, count: prev.count + 1 });
		}
		return Array.from(map.entries()).map(([email, {sum, count}]) => ({ email, avg: count? (sum/count*10):0, count })).sort((a,b)=>b.avg-a.avg).slice(0, 50);
	}

	const routes = {
		home: pageHome,
		login: pageLogin,
		signup: pageSignup,
		groups: pageGroups,
		math: pageMath,
		physics: pagePhysics,
		exams: pageExams,
		results: pageResults,
		ai: pageAI,
	};

	function handleRoute() {
		const hash = (window.location.hash || '#home').slice(1);
		const page = routes[hash] || pageHome;
		page();
	}

	// Nav clicks
	nav.addEventListener('click', (e) => {
		const btn = e.target.closest('button[data-route]');
		if (!btn) return;
		navigate(btn.getAttribute('data-route'));
	});

	logoutBtn.addEventListener('click', () => {
		localStorage.removeItem(STORAGE_KEYS.session);
		updateNavAuthState();
		navigate('home');
	});

	window.addEventListener('hashchange', handleRoute);
	updateNavAuthState();
	handleRoute();
})();


