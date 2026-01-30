// Initialize Supabase
const supabaseUrl = 'https://ojlxkzkialguthdeiley.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHhremtpYWxndXRoZGVpbGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTE0MjQsImV4cCI6MjA4NTMyNzQyNH0.CYH4hRn4w87vvvskkHOQMyKONyDWnvF7_m5IOfgPR94';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ========== GLOBAL VARIABLES ==========
let acquisitions = [];
let editingId = null;

// ========== MAIN INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('QFC Group Platform initialized');
    initializeForm();
    loadAcquisitions();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('requestDate');
    if (dateInput) dateInput.value = today;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const timeLimitInput = document.getElementById('timeLimit');
    if (timeLimitInput) timeLimitInput.value = nextWeek.toISOString().split('T')[0];
    
    // Auto-calculate events
    const fareInput = document.getElementById('fare');
    const taxesInput = document.getElementById('taxes');
    const paymentInput = document.getElementById('paymentPercentage');
    const seatsInput = document.getElementById('noOfSeats');
    const ticketsInput = document.getElementById('ticketsIssued');
    
    if (fareInput) fareInput.addEventListener('input', calculateAmounts);
    if (taxesInput) taxesInput.addEventListener('input', calculateAmounts);
    if (paymentInput) paymentInput.addEventListener('input', calculateAmounts);
    if (seatsInput) seatsInput.addEventListener('input', calculateBalanceTickets);
    if (ticketsInput) ticketsInput.addEventListener('input', calculateBalanceTickets);
    
    // Generate SR number
    generateSRNumber();
});

// ========== FORM FUNCTIONS ==========
function initializeForm() {
    generateSRNumber();
    calculateAmounts();
    calculateBalanceTickets();
}

function generateSRNumber() {
    if (editingId) return;
    
    const srField = document.getElementById('srNumber');
    if (!srField) return;
    
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    srField.value = `SR${year}${month}${random}`;
}

function calculateAmounts() {
    const fare = parseFloat(document.getElementById('fare')?.value) || 0;
    const taxes = parseFloat(document.getElementById('taxes')?.value) || 0;
    const percentage = parseFloat(document.getElementById('paymentPercentage')?.value) || 100;
    
    const total = fare + taxes;
    const payable = total * (percentage / 100);
    
    const pnrField = document.getElementById('pnrAmount');
    const payableField = document.getElementById('payableAmount');
    
    if (pnrField) pnrField.value = total.toFixed(2);
    if (payableField) payableField.value = payable.toFixed(2);
}

function calculateBalanceTickets() {
    const totalSeats = parseInt(document.getElementById('noOfSeats')?.value) || 0;
    const issued = parseInt(document.getElementById('ticketsIssued')?.value) || 0;
    const balance = totalSeats - issued;
    
    const balanceField = document.getElementById('balanceTickets');
    if (balanceField) balanceField.value = balance > 0 ? balance : 0;
}

// ========== DATABASE FUNCTIONS ==========
async function saveAcquisition() {
    console.log('Save acquisition started');
    
    // Disable save button
    const saveBtn = document.querySelector('button[onclick="saveAcquisition()"]');
    const originalText = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...';
    }
    
    try {
        // Get form data
        const formData = {
            sr_number: document.getElementById('srNumber')?.value || '',
            request_date: document.getElementById('requestDate')?.value || new Date().toISOString().split('T')[0],
            airline_pnr: document.getElementById('airlinePnr')?.value || '',
            no_of_seats: parseInt(document.getElementById('noOfSeats')?.value) || 0,
            fare: parseFloat(document.getElementById('fare')?.value) || 0,
            time_limit: document.getElementById('timeLimit')?.value || '',
            investment_type: document.getElementById('investmentType')?.value || 'group_seats',
            license_number: document.getElementById('license')?.value || '',
            branch: document.getElementById('branch')?.value || '',
            gds_pnr: document.getElementById('gdsPnr')?.value || null,
            segment: document.getElementById('segment')?.value || 'domestic',
            airline: document.getElementById('airline')?.value || '',
            outbound_date: document.getElementById('outboundDate')?.value || null,
            inbound_date: document.getElementById('inboundDate')?.value || null,
            sector: document.getElementById('sector')?.value || '',
            taxes: parseFloat(document.getElementById('taxes')?.value) || 0,
            payable_amount: parseFloat(document.getElementById('payableAmount')?.value) || 0,
            pnr_amount: parseFloat(document.getElementById('pnrAmount')?.value) || 0,
            issuance_date: document.getElementById('issuanceDate')?.value || null,
            payment_percentage: parseFloat(document.getElementById('paymentPercentage')?.value) || 100,
            emd_refund_date: document.getElementById('emdRefundDate')?.value || null,
            first_emd_number: document.getElementById('emd1Number')?.value || null,
            first_emd_amount: document.getElementById('emd1Amount')?.value ? parseFloat(document.getElementById('emd1Amount').value) : null,
            first_emd_status: document.getElementById('emd1Status')?.value || null,
            first_emd_time_limit: document.getElementById('emd1TimeLimit')?.value || null,
            first_emd_issuance_date: document.getElementById('emd1IssuanceDate')?.value || null,
            first_emd_payment_percentage: document.getElementById('emd1PaymentPercent')?.value ? parseFloat(document.getElementById('emd1PaymentPercent').value) : null,
            second_emd_number: document.getElementById('emd2Number')?.value || null,
            second_emd_amount: document.getElementById('emd2Amount')?.value ? parseFloat(document.getElementById('emd2Amount').value) : null,
            second_emd_time_limit: document.getElementById('emd2TimeLimit')?.value || null,
            third_emd_number: document.getElementById('emd3Number')?.value || null,
            third_emd_amount: document.getElementById('emd3Amount')?.value ? parseFloat(document.getElementById('emd3Amount').value) : null,
            third_emd_time_limit: document.getElementById('emd3TimeLimit')?.value || null,
            ticketing_status: document.getElementById('ticketingStatus')?.value || 'pending',
            no_of_tickets_issued: parseInt(document.getElementById('ticketsIssued')?.value) || 0,
            balance_tickets: parseInt(document.getElementById('balanceTickets')?.value) || 0,
            last_ticket_date: document.getElementById('lastTicketDate')?.value || null,
            status: document.getElementById('overallStatus')?.value || 'draft',
            notes: document.getElementById('notes')?.value || null
        };

        // Validate
        if (!formData.sr_number || !formData.airline_pnr || !formData.time_limit) {
            throw new Error('SR Number, Airline PNR and Time Limit are required');
        }

        if (editingId) {
            // UPDATE
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .update(formData)
                .eq('id', editingId)
                .select();
            
            if (error) throw error;
            
            showSuccess('✅ Updated successfully! SR#: ' + formData.sr_number);
            editingId = null;
        } else {
            // INSERT
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .insert([formData])
                .select();
            
            if (error) throw error;
            
            showSuccess('✅ Saved successfully! SR#: ' + formData.sr_number);
        }
        
        resetForm();
        loadAcquisitions();
        
    } catch (error) {
        console.error('Error:', error);
        showError('❌ Error: ' + (error.message || 'Check console'));
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText || '<i class="bi bi-save me-2"></i>Save';
        }
    }
}

async function editAcquisition(id) {
    try {
        const { data, error } = await supabaseClient
            .from('seat_acquisitions')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        editingId = id;
        
        // Fill form
        const fields = [
            { id: 'srNumber', value: data.sr_number },
            { id: 'requestDate', value: data.request_date },
            { id: 'investmentType', value: data.investment_type },
            { id: 'license', value: data.license_number || '' },
            { id: 'branch', value: data.branch },
            { id: 'airlinePnr', value: data.airline_pnr },
            { id: 'gdsPnr', value: data.gds_pnr || '' },
            { id: 'segment', value: data.segment },
            { id: 'airline', value: data.airline || '' },
            { id: 'noOfSeats', value: data.no_of_seats },
            { id: 'outboundDate', value: data.outbound_date || '' },
            { id: 'inboundDate', value: data.inbound_date || '' },
            { id: 'sector', value: data.sector || '' },
            { id: 'fare', value: data.fare },
            { id: 'taxes', value: data.taxes || '' },
            { id: 'paymentPercentage', value: data.payment_percentage || 100 },
            { id: 'issuanceDate', value: data.issuance_date || '' },
            { id: 'timeLimit', value: data.time_limit },
            { id: 'emdRefundDate', value: data.emd_refund_date || '' },
            { id: 'emd1Number', value: data.first_emd_number || '' },
            { id: 'emd1Amount', value: data.first_emd_amount || '' },
            { id: 'emd1Status', value: data.first_emd_status || '' },
            { id: 'emd1TimeLimit', value: data.first_emd_time_limit || '' },
            { id: 'emd1IssuanceDate', value: data.first_emd_issuance_date || '' },
            { id: 'emd1PaymentPercent', value: data.first_emd_payment_percentage || '' },
            { id: 'emd2Number', value: data.second_emd_number || '' },
            { id: 'emd2Amount', value: data.second_emd_amount || '' },
            { id: 'emd2TimeLimit', value: data.second_emd_time_limit || '' },
            { id: 'emd3Number', value: data.third_emd_number || '' },
            { id: 'emd3Amount', value: data.third_emd_amount || '' },
            { id: 'emd3TimeLimit', value: data.third_emd_time_limit || '' },
            { id: 'ticketingStatus', value: data.ticketing_status || 'pending' },
            { id: 'ticketsIssued', value: data.no_of_tickets_issued || '' },
            { id: 'lastTicketDate', value: data.last_ticket_date || '' },
            { id: 'overallStatus', value: data.status || 'draft' },
            { id: 'notes', value: data.notes || '' }
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) element.value = field.value || '';
        });
        
        calculateAmounts();
        calculateBalanceTickets();
        
        // Update UI
        const saveBtn = document.querySelector('button[onclick="saveAcquisition()"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Update';
            saveBtn.className = 'btn btn-warning btn-lg';
        }
        
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        
        document.getElementById('acquireForm')?.scrollIntoView({ behavior: 'smooth' });
        
        showSuccess('✏️ Editing: ' + data.sr_number);
        
    } catch (error) {
        console.error('Edit error:', error);
        showError('Failed to load for editing');
    }
}

async function deleteAcquisition(id, srNumber) {
    if (!confirm(`Delete ${srNumber}?`)) return;
    
    try {
        const { error } = await supabaseClient
            .from('seat_acquisitions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        if (editingId === id) {
            editingId = null;
            resetForm();
        }
        
        showSuccess('Deleted: ' + srNumber);
        loadAcquisitions();
        
    } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete');
    }
}

async function loadAcquisitions() {
    try {
        const { data, error } = await supabaseClient
            .from('seat_acquisitions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        acquisitions = data || [];
        updateTable();
        updateDashboard();
        
    } catch (error) {
        console.error('Load error:', error);
        acquisitions = [];
        updateTable();
    }
}

// ========== UI FUNCTIONS ==========
function updateTable() {
    const tableBody = document.getElementById('acquisitionsTable');
    if (!tableBody) return;
    
    if (!acquisitions || acquisitions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No data</td></tr>';
        return;
    }
    
    let html = '';
    acquisitions.forEach(item => {
        const id = item.id || '';
        const isEditing = editingId === id;
        const rowClass = isEditing ? 'table-warning' : '';
        
        html += `
            <tr class="${rowClass}">
                <td><strong>${item.sr_number || ''}</strong></td>
                <td>${item.airline_pnr || ''}</td>
                <td>${item.no_of_seats || 0}</td>
                <td>${item.fare ? parseFloat(item.fare).toFixed(2) : '0.00'}</td>
                <td><span class="status-badge status-draft">${item.status || 'draft'}</span></td>
                <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editAcquisition('${id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteAcquisition('${id}', '${item.sr_number}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function updateDashboard() {
    if (!acquisitions || acquisitions.length === 0) {
        document.getElementById('totalSeats')?.textContent = '0';
        document.getElementById('totalRevenue')?.textContent = '0.00';
        document.getElementById('totalAcquisitions')?.textContent = '0';
        document.getElementById('pendingItems')?.textContent = '0';
        return;
    }
    
    const totalSeats = acquisitions.reduce((sum, item) => sum + (item.no_of_seats || 0), 0);
    const totalRevenue = acquisitions.reduce((sum, item) => sum + (item.payable_amount || 0), 0);
    const pendingCount = acquisitions.filter(item => item.status === 'draft').length;
    
    document.getElementById('totalSeats')?.textContent = totalSeats;
    document.getElementById('totalRevenue')?.textContent = totalRevenue.toFixed(2);
    document.getElementById('totalAcquisitions')?.textContent = acquisitions.length;
    document.getElementById('pendingItems')?.textContent = pendingCount;
}

function resetForm() {
    editingId = null;
    
    // Generate new SR
    generateSRNumber();
    
    // Clear fields
    const clearIds = [
        'license', 'branch', 'airlinePnr', 'gdsPnr', 'airline',
        'noOfSeats', 'outboundDate', 'inboundDate', 'sector',
        'fare', 'taxes', 'issuanceDate',
        'emdRefundDate', 'emd1Number', 'emd1Amount', 'emd1TimeLimit', 
        'emd1IssuanceDate', 'emd1PaymentPercent',
        'emd2Number', 'emd2Amount', 'emd2TimeLimit',
        'emd3Number', 'emd3Amount', 'emd3TimeLimit',
        'ticketsIssued', 'lastTicketDate', 'notes'
    ];
    
    clearIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // Reset selects
    document.getElementById('investmentType').value = 'group_seats';
    document.getElementById('segment').value = 'domestic';
    document.getElementById('emd1Status').value = '';
    document.getElementById('ticketingStatus').value = 'pending';
    document.getElementById('overallStatus').value = 'draft';
    document.getElementById('paymentPercentage').value = 100;
    
    // Set dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('requestDate').value = today;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('timeLimit').value = nextWeek.toISOString().split('T')[0];
    
    // Calculate
    calculateAmounts();
    calculateBalanceTickets();
    
    // Update buttons
    const saveBtn = document.querySelector('button[onclick="saveAcquisition()"]');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-save me-2"></i>Save';
        saveBtn.className = 'btn btn-primary btn-lg';
    }
    
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    updateTable();
    showSuccess('Form reset');
}

function cancelEdit() {
    if (editingId) resetForm();
}

function showSuccess(message) {
    const successToast = document.getElementById('successToast');
    const successMessage = document.getElementById('successMessage');
    
    if (successMessage) successMessage.textContent = message;
    if (successToast) {
        const toast = new bootstrap.Toast(successToast);
        toast.show();
    }
}

function showError(message) {
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorMessage) errorMessage.textContent = message;
    if (errorToast) {
        const toast = new bootstrap.Toast(errorToast);
        toast.show();
    }
}

// Fix for Chrome extension async error
if (typeof chrome !== 'undefined' && chrome.runtime) {
    window.addEventListener('error', function(e) {
        console.log('Error caught:', e.error);
    });
}

// Initial load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadAcquisitions, 100);
} else {
    document.addEventListener('DOMContentLoaded', loadAcquisitions);
}