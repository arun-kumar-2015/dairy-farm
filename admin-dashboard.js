document.addEventListener('DOMContentLoaded', () => {
    // Check if Supabase is initialized correctly
    if (!supabaseClient) {
        alert("Supabase client is not initialized. Please configure config.js with your keys.");
        window.location.href = 'index.html';
        return;
    }

    // UI Elements
    const adminEmailSpan = document.getElementById('adminEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    // Cards
    const totalOrdersCount = document.getElementById('totalOrdersCount');
    const pendingOrdersCount = document.getElementById('pendingOrdersCount');
    const deliveredOrdersCount = document.getElementById('deliveredOrdersCount');

    // Table
    const ordersTableBody = document.getElementById('ordersTableBody');
    const recentOrdersBody = document.getElementById('recentOrdersBody');
    const tableLoadingRow = document.getElementById('tableLoadingRow');
    const searchInput = document.getElementById('searchInput');

    // Navigation
    const menuItems = document.querySelectorAll('.sidebar-menu li[data-target]');
    const sections = document.querySelectorAll('.content-section');
    const adminMenuToggle = document.getElementById('adminMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    let allOrders = [];

    // Initialize Dashboard
    checkAuthAndInit();

    async function checkAuthAndInit() {
        // 1. Check Session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (!session || sessionError) {
            window.location.href = 'admin-login.html';
            return;
        }

        // 2. Check Admin Role
        const userId = session.user.id;
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileError || !profileData || profileData.role !== 'admin') {
            await supabaseClient.auth.signOut();
            window.location.href = 'admin-login.html';
            return;
        }

        // Auth Successful
        adminEmailSpan.textContent = session.user.email;

        // Fetch Initial Data
        fetchOrders();

        // Setup Realtime Subscription
        setupRealtime();
    }

    // Navigation Logic
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            setTimeout(() => { sections.forEach(s => s.style.display = 'none'); }, 300); // Wait for fade out

            // Add active to clicked
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);

            setTimeout(() => {
                targetSection.style.display = 'block';
                setTimeout(() => targetSection.classList.add('active'), 50); // Fade in
            }, 300);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    adminMenuToggle.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Logout Logic
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'admin-login.html';
    });

    // Data Fetching
    async function fetchOrders() {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allOrders = data;
            renderOrders(data);
            updateDashboardMetrics(data);
        } catch (error) {
            console.error('Error fetching orders:', error.message);

            // Helpful error message if table doesn't exist
            if (error.message.includes('relation "public.orders" does not exist')) {
                tableLoadingRow.innerHTML = '<td colspan="8" style="text-align: center; color: #f3616d; padding: 40px;"><i class="fas fa-exclamation-triangle fa-2x"></i><p>Database table "orders" does not exist yet.<br>Please run the SQL setup script in your Supabase project.</p></td>';
            } else {
                showToast('Failed to load orders from database.', 'error');
                tableLoadingRow.innerHTML = '<td colspan="8" style="text-align: center; color: #f3616d; padding: 30px;">Error loading data: ' + error.message + '</td>';
            }
        }
    }

    // Realtime Setup
    function setupRealtime() {
        supabaseClient
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
                console.log('Realtime Change received!', payload);
                fetchOrders(); // Re-fetch all to keep sorting perfect

                if (payload.eventType === 'INSERT') {
                    showToast(`New order received from ${payload.new.customer_name}!`, 'info');
                } else if (payload.eventType === 'UPDATE') {
                    showToast(`Order status updated.`, 'info');
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to realtime order updates.');
                }
            });
    }

    // Render Table
    function renderOrders(ordersData) {
        ordersTableBody.innerHTML = '';
        recentOrdersBody.innerHTML = '';

        if (ordersData.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--gray);">No orders found.</td></tr>';
            recentOrdersBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No recent activity.</td></tr>';
            return;
        }

        ordersData.forEach((order, index) => {
            const tr = document.createElement('tr');

            const date = new Date(order.created_at);
            const formattedDate = date.toLocaleDateString() + '<br><small>' +
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</small>';

            const statusClass = order.order_status.toLowerCase() === 'pending' ? 'status-pending' : 'status-delivered';

            const actionBtn = order.order_status === 'Pending'
                ? `<button class="btn-action btn-success-action" onclick="updateOrderStatus('${order.id}', 'Delivered')" title="Mark Delivered"><i class="fas fa-check"></i></button>`
                : `<span class="text-muted"><i class="fas fa-check-double"></i></span>`;

            tr.innerHTML = `
                <td><small style="color:var(--gray)">${order.id.substring(0, 8)}</small></td>
                <td>${formattedDate}</td>
                <td><strong>${order.customer_name}</strong></td>
                <td>
                    <i class="fas fa-phone fa-fw" style="color:var(--primary); font-size: 0.8em"></i> ${order.phone_number}<br>
                    <small style="color:var(--gray)"><i class="fas fa-map-marker-alt fa-fw"></i> ${order.address}</small>
                </td>
                <td>
                    ${order.product_name}<br>
                    <span class="qty-badge">Qty: ${order.quantity}</span>
                </td>
                <td><strong>${order.total_price}</strong></td>
                <td><span class="status-badge ${statusClass}">${order.order_status}</span></td>
                <td class="action-cell">
                    ${actionBtn}
                    <button class="btn-action btn-danger-action" onclick="deleteOrder('${order.id}')" title="Delete Order"><i class="fas fa-trash"></i></button>
                </td>
            `;
            ordersTableBody.appendChild(tr);

            // Populate recent activity on dashboard
            if (index < 5) {
                const rt = document.createElement('tr');
                rt.innerHTML = `
                    <td><small>${order.id.substring(0, 6)}</small></td>
                    <td>${order.customer_name}</td>
                    <td><span class="status-badge ${statusClass}">${order.order_status}</span></td>
                `;
                recentOrdersBody.appendChild(rt);
            }
        });
    }

    // Update Metrics
    function updateDashboardMetrics(ordersData) {
        totalOrdersCount.textContent = ordersData.length;
        const pending = ordersData.filter(o => o.order_status === 'Pending').length;
        const delivered = ordersData.filter(o => o.order_status === 'Delivered').length;

        // Counter animation could go here, keeping simple for now
        pendingOrdersCount.textContent = pending;
        deliveredOrdersCount.textContent = delivered;
    }

    // Search Logic
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        if (searchTerm === '') {
            renderOrders(allOrders);
            return;
        }

        const filtered = allOrders.filter(order =>
            order.phone_number.toLowerCase().includes(searchTerm) ||
            order.customer_name.toLowerCase().includes(searchTerm) ||
            order.id.toLowerCase().includes(searchTerm)
        );
        renderOrders(filtered);
    });

    // Global Functions for inline onclick handlers
    window.updateOrderStatus = async function (orderId, newStatus) {
        try {
            const { error } = await supabaseClient
                .from('orders')
                .update({ order_status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            // No need to showToast here if realtime listener catches it, but good for immediate feedback
            showToast(`Order marked as ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error updating order:', error.message);
            showToast('Failed to update order status: ' + error.message, 'error');
        }
    };

    window.deleteOrder = async function (orderId) {
        if (!confirm('Are you sure you want to securely delete this order? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('orders')
                .delete()
                .eq('id', orderId);

            if (error) throw error;
            showToast('Order deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting order:', error.message);
            showToast('Failed to delete order: ' + error.message, 'error');
        }
    };

    // Helper: Toast Notifications
    function showToast(text, type = 'success') {
        let bgColor = 'var(--primary)'; // success green default
        if (type === 'error') bgColor = '#f3616d';
        if (type === 'info') bgColor = '#435ebe';

        Toastify({
            text: text,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: bgColor,
            stopOnFocus: true,
            style: {
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                fontFamily: "'Outfit', sans-serif"
            }
        }).showToast();
    }
});
