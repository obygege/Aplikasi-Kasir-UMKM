document.addEventListener('DOMContentLoaded', function () {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylZOgwX-AnohlwUxFIAAjWHY89Xg1TGMCZkpnHyaflKU70EtgbGEwRR10hVq7Jh4Y7/exec';
    
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    const pageContents = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('page-title');
    const logoutButtons = document.querySelectorAll('.logout-btn');
    let financialChart = null;
    let transactions = [];
    let products = [];
    let activeFilter = 'day';

    async function fetchData() {
        try {
            document.body.style.cursor = 'wait';
            const [transRes, prodRes] = await Promise.all([
                fetch(SCRIPT_URL),
                fetch(`${SCRIPT_URL}?action=getProducts`)
            ]);
            transactions = await transRes.json();
            products = await prodRes.json();
            updateUI();
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Gagal memuat data. Periksa koneksi atau URL script.');
        } finally {
            document.body.style.cursor = 'default';
        }
    }

    const formatRupiah = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    function renderProducts() {
        const productListBody = document.getElementById('admin-product-list');
        if (!productListBody) return;
        productListBody.innerHTML = '';
        products.forEach(p => {
            const row = document.createElement('tr');
            row.className = 'border-b';
            row.innerHTML = `
                <td class="p-3">${p.name}</td>
                <td class="p-3">${formatRupiah(p.price)}</td>
                <td class="p-3">${p.stock}</td>
                <td class="p-3"><button data-id="${p.id}" class="delete-product-btn text-red-500 hover:text-red-700 font-semibold">Hapus</button></td>`;
            productListBody.appendChild(row);
        });

        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Yakin ingin menghapus produk ini?')) return;
                const id = e.target.dataset.id;
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'deleteProduct', id: id }),
                });
                await fetchData();
            });
        });
    }
    
    document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'addProduct',
                name: document.getElementById('product-name').value,
                price: document.getElementById('product-price').value,
                stock: document.getElementById('product-stock').value
            }),
        });
        e.target.reset();
        await fetchData();
        submitButton.disabled = false;
        submitButton.textContent = 'Tambah';
    });

    function getFilteredTransactions() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        return transactions.filter(t => {
            const transactionDate = new Date(t.date);
            if (activeFilter === 'day') return transactionDate >= startOfDay && transactionDate <= endOfDay;
            if (activeFilter === 'month') return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
            if (activeFilter === 'year') return transactionDate >= startOfYear && transactionDate <= endOfYear;
            return true;
        });
    }
    
    function updateDashboard() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const todayTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= startOfToday && transactionDate <= endOfToday;
        });
        
        const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        document.getElementById('admin-total-pemasukan').textContent = formatRupiah(todayIncome);
        document.getElementById('admin-total-pengeluaran').textContent = formatRupiah(todayExpense);
        document.getElementById('admin-total-keuntungan').textContent = formatRupiah(todayIncome - todayExpense);
    }
    
    function renderReport() {
        const filteredTransactions = getFilteredTransactions();
        const recordsBody = document.getElementById('admin-financial-records');
        const data = aggregateDataForTable(filteredTransactions);

        if (!recordsBody) return;
        recordsBody.innerHTML = '';
        data.forEach(([date, values]) => {
            const profit = values.income - values.expense;
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3">${date}</td><td class="p-3 text-green-600">${formatRupiah(values.income)}</td><td class="p-3 text-red-600">${formatRupiah(values.expense)}</td><td class="p-3 font-bold">${formatRupiah(profit)}</td>`;
            recordsBody.appendChild(row);
        });
        renderChart(data);
    }

    function aggregateDataForTable(filteredTransactions) {
        const aggregated = filteredTransactions.reduce((acc, t) => {
            const dateKey = new Date(t.date).toLocaleDateString('id-ID');
            if (!acc[dateKey]) acc[dateKey] = { income: 0, expense: 0 };
            acc[dateKey][t.type] += t.amount;
            return acc;
        }, {});
        return Object.entries(aggregated).sort((a, b) => new Date(b[0].split('/').reverse().join('-')) - new Date(a[0].split('/').reverse().join('-')));
    }
    
    function renderChart(data) {
        const ctx = document.getElementById('financialChart')?.getContext('2d');
        if (!ctx) return;
        if (financialChart) financialChart.destroy();
        const reversedData = data.reverse();
        const labels = reversedData.map(([date, _]) => date);
        const profitData = reversedData.map(([_, values]) => values.income - values.expense);
        financialChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Keuntungan', data: profitData, borderColor: 'rgb(22, 163, 74)', tension: 0.1, fill: true, backgroundColor: 'rgba(22, 163, 74, 0.1)' }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.replace('bg-red-500', 'bg-gray-300'));
            e.target.classList.replace('bg-gray-300', 'bg-red-500');
            activeFilter = e.target.dataset.filter;
            renderReport();
        });
    });

    function updateUI() {
        updateDashboard();
        renderProducts();
        renderReport();
    }
    
    function switchPage(targetId) {
        pageContents.forEach(content => content.classList.toggle('hidden', content.id !== targetId));
        const activeLink = document.querySelector(`a[href="#${targetId}"]`);
        if (activeLink) pageTitle.textContent = activeLink.textContent.trim();
        if (targetId === 'laporan' || targetId === 'dashboard') {
            updateUI();
        }
    }

    allNavLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            allNavLinks.forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll(`a[href="${targetId}"]`).forEach(l => l.classList.add('active'));
            switchPage(targetId.substring(1));
        });
    });

    logoutButtons.forEach(button => button.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.clear();
        window.location.href = '../index.html';
    }));

    switchPage('dashboard');
    fetchData();
});