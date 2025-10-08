document.addEventListener('DOMContentLoaded', function () {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylZOgwX-AnohlwUxFIAAjWHY89Xg1TGMCZkpnHyaflKU70EtgbGEwRR10hVq7Jh4Y7/exec';
    
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    const pageContents = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('page-title');
    const logoutButtons = document.querySelectorAll('.logout-btn');

    let cart = [];
    let transactions = [];
    let products = [];
    
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

    async function addTransaction(type, description, amount) {
        const newTransaction = { id: Date.now(), type, description, amount: parseInt(amount) };
        await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(newTransaction) });
        transactions.push(newTransaction);
    }
    
    const formatRupiah = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    
    function renderProducts() {
        const productList = document.getElementById('product-list');
        if (!productList) return;
        productList.innerHTML = '';
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'bg-gray-200 p-4 rounded-lg text-center cursor-pointer hover:bg-yellow-300';
            productCard.innerHTML = `<h3 class="font-bold">${product.name}</h3><p>${formatRupiah(product.price)}</p>`;
            productCard.addEventListener('click', () => addToCart(product));
            productList.appendChild(productCard);
        });
    }

    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        renderCart();
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        renderCart();
    }
    
    function calculateTotal() {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    function renderCart() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        const uangBayarInput = document.getElementById('uang-bayar');
        const kembalianDisplay = document.getElementById('kembalian');

        if (!cartItems || !cartTotal) return;
        cartItems.innerHTML = '';
        const total = calculateTotal();

        cart.forEach(item => {
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'flex justify-between items-center py-1';
            cartItemDiv.innerHTML = `
                <div>${item.name} <span class="text-sm text-gray-500">x ${item.quantity}</span></div>
                <div class="flex items-center">
                    <span class="mr-4 font-semibold">${formatRupiah(item.price * item.quantity)}</span>
                    <button data-id="${item.id}" class="remove-from-cart-btn text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
                </div>`;
            cartItems.appendChild(cartItemDiv);
        });
        cartTotal.textContent = formatRupiah(total);
        
        document.querySelectorAll('.remove-from-cart-btn').forEach(btn => {
            btn.onclick = (e) => removeFromCart(Number(e.target.dataset.id));
        });
        
        const uangBayar = parseFloat(uangBayarInput.value) || 0;
        const kembalian = uangBayar - total;
        kembalianDisplay.textContent = formatRupiah(kembalian > 0 ? kembalian : 0);
    }
    
    document.getElementById('uang-bayar')?.addEventListener('input', renderCart);

    async function handlePayment() {
        const total = calculateTotal();
        const uangBayar = parseFloat(document.getElementById('uang-bayar').value) || 0;

        if (total === 0) return alert('Keranjang masih kosong!');
        if (uangBayar < total) return alert('Uang bayar tidak cukup!');
        
        const description = cart.map(item => `${item.name} x${item.quantity}`).join(', ');
        const submitButton = document.getElementById('bayar-btn');
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        await addTransaction('income', `Penjualan: ${description}`, total);
        
        cart = [];
        document.getElementById('uang-bayar').value = '';
        await fetchData();
        alert('Penjualan berhasil disimpan!');
        submitButton.disabled = false;
        submitButton.textContent = 'PROSES BAYAR';
    }

    function updateDashboard() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= todayStart && transactionDate <= todayEnd;
        });

        const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const todaySalesCount = todayTransactions.filter(t => t.description.startsWith('Penjualan')).length;

        document.getElementById('total-penjualan-hari-ini').textContent = todaySalesCount;
        document.getElementById('total-pemasukan-hari-ini').textContent = formatRupiah(todayIncome);
        document.getElementById('total-keuntungan-hari-ini').textContent = formatRupiah(todayIncome - todayExpense);
    }

    function renderFinancialRecords() {
        const recordsBody = document.getElementById('financial-records-body');
        if(!recordsBody) return;
        recordsBody.innerHTML = '';
        const reversedTransactions = [...transactions].reverse();
        reversedTransactions.forEach(t => {
            const row = document.createElement('tr');
            const transactionDate = new Date(t.date);
            const formattedDate = `${transactionDate.toLocaleDateString('id-ID')} ${transactionDate.toLocaleTimeString('id-ID')}`;
            row.innerHTML = `
                <td class="p-3">${formattedDate}</td>
                <td class="p-3">${t.description}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs rounded ${t.type === 'income' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${t.type}</span></td>
                <td class="p-3 font-semibold">${formatRupiah(t.amount)}</td>`;
            recordsBody.appendChild(row);
        });
    }

    function updateUI() {
        updateDashboard();
        renderProducts();
        renderCart();
        renderFinancialRecords();
    }

    function switchPage(targetId) {
        pageContents.forEach(content => content.classList.toggle('hidden', content.id !== targetId));
        const activeLink = document.querySelector(`a[href="#${targetId}"]`);
        if (activeLink) pageTitle.textContent = activeLink.textContent.trim();
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
    
    document.getElementById('transaction-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';
        await addTransaction(
            document.getElementById('transaction-type').value,
            document.getElementById('transaction-description').value,
            document.getElementById('transaction-amount').value
        );
        this.reset();
        await fetchData();
        alert('Transaksi berhasil disimpan!');
        submitButton.disabled = false;
        submitButton.textContent = 'Simpan';
    });

    document.getElementById('bayar-btn')?.addEventListener('click', handlePayment);

    logoutButtons.forEach(button => button.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.clear();
        window.location.href = '../index.html';
    }));
    
    switchPage('dashboard');
    fetchData();
});