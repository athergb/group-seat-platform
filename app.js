// Initialize Supabase
const supabaseUrl = 'https://ojlxkzkialguthdeiley.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHhremtpYWxndXRoZGVpbGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTE0MjQsImV4cCI6MjA4NTMyNzQyNH0.CYH4hRn4w87vvvskkHOQMyKONyDWnvF7_m5IOfgPR94';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ========== GLOBAL VARIABLES ==========
let acquisitions = [];
let editingId = null;

// ========== MAIN INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    loadAcquisitions();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('requestDate').value = today;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('timeLimit').value = nextWeek.toISOString().split('T')[0];
    
    // Auto-calculate events
    document.getElementById('fare').addEventListener('input', calculateAmounts);
    document.getElementById('taxes').addEventListener('input', calculateAmounts);
    document.getElementById('paymentPercentage').addEventListener('input', calculateAmounts);
    document.getElementById('noOfSeats').addEventListener('input', calculateBalanceTickets);
    document.getElementById('ticketsIssued').addEventListener('input', calculateBalanceTickets);
    
    // Generate SR number
    generateSRNumber();
    
    // Update submit button text
    updateSubmitButton();
});

// ========== FORM FUNCTIONS ==========
function initializeForm() {
    generateSRNumber();
    calculateAmounts();
    calculateBalanceTickets();
}

function generateSRNumber() {
    if (editingId) return;
    
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    document.getElementById('srNumber').value = `SR${year}${month}${random}`;
}

function calculateAmounts() {
    const fare = parseFloat(document.getElementById('fare').value) || 0;
    const taxes = parseFloat(document.getElementById('taxes').value) || 0;
    const percentage = parseFloat(document.getElementById('paymentPercentage').value) || 100;
    
    const total = fare + taxes;
    const payable = total * (percentage / 100);
    
    document.getElementById('pnrAmount').value = total.toFixed(2);
    document.getElementById('payableAmount').value = payable.toFixed(2);
}

function calculateBalanceTickets() {
    const totalSeats = parseInt(document.getElementById('noOfSeats').value) || 0;
    const issued = parseInt(document.getElementById('ticketsIssued').value) || 0;
    const balance = totalSeats - issued;
    
    document.getElementById('balanceTickets').value = balance > 0 ? balance : 0;
}

function updateSubmitButton() {
    const submitBtn = document.querySelector('button[onclick="saveAcquisition()"]');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    if (submitBtn) {
        if (editingId) {
            submitBtn.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Update Acquisition';
            submitBtn.className = 'btn btn-warning btn-lg';
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
        } else {
            submitBtn.innerHTML = '<i class="bi bi-save me-2"></i>Save Acquisition';
            submitBtn.className = 'btn btn-primary btn-lg';
            if (cancelBtn) cancelBtn.style.display = 'none';
        }
    }
}

// ========== SAFE VALUE GETTER ==========
function getFormValue(id, isNumber = false, isDate = false) {
    const element = document.getElementById(id);
    if (!element) return null;
    
    const value = element.value;
    
    // Return empty string for empty text fields
    if (value === '' && !isNumber && !isDate) return '';
    
    // Return null for empty number/date fields
    if (value === '') return null;
    
    if (isNumber) return parseFloat(value) || 0;
    if (isDate) return value;
    
    return value;
}

// ========== DATABASE FUNCTIONS ==========
async function saveAcquisition() {
    try {
        // VALIDATE REQUIRED FIELDS
        const requiredFields = [
            { id: 'airlinePnr', name: 'Airline PNR' },
            { id: 'noOfSeats', name: 'Number of Seats' },
            { id: 'fare', name: 'Fare' },
            { id: 'timeLimit', name: 'Time Limit' }
        ];
        
        const missingFields = [];
        requiredFields.forEach(field => {
            const value = getFormValue(field.id);
            if (!value && value !== 0) {
                missingFields.push(field.name);
            }
        });
        
        if (missingFields.length > 0) {
            showError('Please fill required fields: ' + missingFields.join(', '));
            return;
        }
        
        // Get all form values - ALLOW EMPTY/OPTIONAL FIELDS
        const formData = {
            // Basic Information (some required)
            sr_number: getFormValue('srNumber'),
            request_date: getFormValue('requestDate', false, true) || new Date().toISOString().split('T')[0],
            investment_type: getFormValue('investmentType') || 'group_seats',
            license: getFormValue('license') || '',
            branch: getFormValue('branch') || '',
            airline_pnr: getFormValue('airlinePnr'), // REQUIRED
            gds_pnr: getFormValue('gdsPnr'),
            segment: getFormValue('segment') || 'domestic',
            airline: getFormValue('airline') || '',
            no_of_seats: getFormValue('noOfSeats', true) || 0, // REQUIRED
            outbound_date: getFormValue('outboundDate', false, true),
            inbound_date: getFormValue('inboundDate', false, true),
            sector: getFormValue('sector') || '',
            
            // Financial (some required)
            fare: getFormValue('fare', true) || 0, // REQUIRED
            taxes: getFormValue('taxes', true) || 0,
            payable_amount: getFormValue('payableAmount', true) || 0,
            pnr_amount: getFormValue('pnrAmount', true) || 0,
            issuance_date: getFormValue('issuanceDate', false, true),
            time_limit: getFormValue('timeLimit', false, true), // REQUIRED
            payment_percentage: getFormValue('paymentPercentage', true) || 100,
            
            // 1st EMD Details (ALL OPTIONAL - can fill later)
            emd_refund_date: getFormValue('emdRefundDate', false, true),
            first_emd_number: getFormValue('emd1Number'),
            first_emd_amount: getFormValue('emd1Amount', true),
            first_emd_status: getFormValue('emd1Status'),
            first_emd_time_limit: getFormValue('emd1TimeLimit', false, true),
            first_emd_issuance_date: getFormValue('emd1IssuanceDate', false, true),
            first_emd_payment_percentage: getFormValue('emd1PaymentPercent', true),
            
            // 2nd EMD Details (ALL OPTIONAL - can fill later)
            second_emd_number: getFormValue('emd2Number'),
            second_emd_amount: getFormValue('emd2Amount', true),
            second_emd_time_limit: getFormValue('emd2TimeLimit', false, true),
            
            // 3rd EMD Details (ALL OPTIONAL - can fill later)
            third_emd_number: getFormValue('emd3Number'),
            third_emd_amount: getFormValue('emd3Amount', true),
            third_emd_time_limit: getFormValue('emd3TimeLimit', false, true),
            
            // Ticketing Details (ALL OPTIONAL - can fill later)
            ticketing_status: getFormValue('ticketingStatus') || 'pending',
            no_of_tickets_issued: getFormValue('ticketsIssued', true) || 0,
            balance_tickets: getFormValue('balanceTickets', true) || 0,
            last_ticket_date: getFormValue('lastTicketDate', false, true),
            
            // Overall Status
            status: getFormValue('overallStatus') || 'draft',
            notes: getFormValue('notes'),
            
            updated_at: new Date().toISOString()
        };

        console.log('Saving acquisition:', formData);

        if (editingId) {
            // UPDATE existing record
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .update(formData)
                .eq('id', editingId)
                .select();
            
            if (error) throw error;
            
            showSuccess('✅ Acquisition updated successfully! SR#: ' + formData.sr_number);
            editingId = null;
        } else {
            // INSERT new record
            formData.created_at = new Date().toISOString();
            
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .insert([formData])
                .select();
            
            if (error) throw error;
            
            showSuccess('✅ Acquisition saved successfully! SR#: ' + formData.sr_number);
        }
        
        // Reset form and reload data
        resetForm();
        loadAcquisitions();
        updateDashboard();
        
    } catch (error) {
        console.error('Error saving:', error);
        showError('❌ Failed to save: ' + error.message);
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
        
        // Fill form with data - handle null/empty values
        document.getElementById('srNumber').value = data.sr_number || '';
        document.getElementById('requestDate').value = data.request_date || '';
        document.getElementById('investmentType').value = data.investment_type || 'group_seats';
        document.getElementById('license').value = data.license || '';
        document.getElementById('branch').value = data.branch || '';
        document.getElementById('airlinePnr').value = data.airline_pnr || '';
        document.getElementById('gdsPnr').value = data.gds_pnr || '';
        document.getElementById('segment').value = data.segment || 'domestic';
        document.getElementById('airline').value = data.airline || '';
        document.getElementById('noOfSeats').value = data.no_of_seats || '';
        document.getElementById('outboundDate').value = data.outbound_date || '';
        document.getElementById('inboundDate').value = data.inbound_date || '';
        document.getElementById('sector').value = data.sector || '';
        
        // Financial
        document.getElementById('fare').value = data.fare || '';
        document.getElementById('taxes').value = data.taxes || '';
        document.getElementById('paymentPercentage').value = data.payment_percentage || 100;
        document.getElementById('issuanceDate').value = data.issuance_date || '';
        document.getElementById('timeLimit').value = data.time_limit || '';
        
        // 1st EMD (may be empty)
        document.getElementById('emdRefundDate').value = data.emd_refund_date || '';
        document.getElementById('emd1Number').value = data.first_emd_number || '';
        document.getElementById('emd1Amount').value = data.first_emd_amount || '';
        document.getElementById('emd1Status').value = data.first_emd_status || '';
        document.getElementById('emd1TimeLimit').value = data.first_emd_time_limit || '';
        document.getElementById('emd1IssuanceDate').value = data.first_emd_issuance_date || '';
        document.getElementById('emd1PaymentPercent').value = data.first_emd_payment_percentage || '';
        
        // 2nd EMD (may be empty)
        document.getElementById('emd2Number').value = data.second_emd_number || '';
        document.getElementById('emd2Amount').value = data.second_emd_amount || '';
        document.getElementById('emd2TimeLimit').value = data.second_emd_time_limit || '';
        
        // 3rd EMD (may be empty)
        document.getElementById('emd3Number').value = data.third_emd_number || '';
        document.getElementById('emd3Amount').value = data.third_emd_amount || '';
        document.getElementById('emd3TimeLimit').value = data.third_emd_time_limit || '';
        
        // Ticketing
        document.getElementById('ticketingStatus').value = data.ticketing_status || 'pending';
        document.getElementById('ticketsIssued').value = data.no_of_tickets_issued || '';
        document.getElementById('lastTicketDate').value = data.last_ticket_date || '';
        
        // Overall
        document.getElementById('overallStatus').value = data.status || 'draft';
        document.getElementById('notes').value = data.notes || '';
        
        // Calculate amounts
        calculateAmounts();
        calculateBalanceTickets();
        
        // Update button
        updateSubmitButton();
        
        // Scroll to form
        document.getElementById('acquireForm').scrollIntoView({ behavior: 'smooth' });
        
        showSuccess('✏️ Editing: ' + data.sr_number + ' - You can now update EMD details');
        
    } catch (error) {
        console.error('Error loading for edit:', error);
        showError('Failed to load for editing: ' + error.message);
    }
}

async function deleteAcquisition(id, srNumber) {
    if (!confirm(`🗑️ Delete ${srNumber}?\n\nFlight cancelled? This cannot be undone!`)) {
        return;
    }
    
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
        
        showSuccess('🗑️ Deleted: ' + srNumber + ' (Flight cancelled)');
        
        loadAcquisitions();
        updateDashboard();
        
    } catch (error) {
        console.error('Error deleting:', error);
        showError('Failed to delete: ' + error.message);
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
        
    } catch (error) {
        console.error('Error loading:', error);
        acquisitions = [];
        updateTable();
    }
}

// ========== UI FUNCTIONS ==========
function updateTable() {
    const tableBody = document.getElementById('acquisitionsTable');
    
    if (acquisitions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No acquisitions yet. Start by saving basic details!</td></tr>';
        return;
    }
    
    let html = '';
    acquisitions.forEach(item => {
        const statusClass = item.status === 'approved' ? 'status-approved' : 
                          item.status === 'draft' ? 'status-draft' : 'status-pending';
        
        const isEditing = editingId === item.id;
        const editingClass = isEditing ? 'table-warning' : '';
        
        // Check if EMD details are filled
        const hasEMD = item.first_emd_number || item.second_emd_number || item.third_emd_number;
        const emdBadge = hasEMD ? '<span class="badge bg-success ms-1">EMD</span>' : '<span class="badge bg-secondary ms-1">No EMD</span>';
        
        html += `
            <tr class="${editingClass}">
                <td>
                    <strong>${item.sr_number}</strong> 
                    ${isEditing ? '✏️' : ''}
                    ${emdBadge}
                </td>
                <td>${item.airline_pnr}</td>
                <td>${item.no_of_seats}</td>
                <td>${item.fare?.toFixed(2) || '0.00'}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editAcquisition('${item.id}')" title="Edit/Add EMD">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAcquisition('${item.id}', '${item.sr_number}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function updateDashboard() {
    if (acquisitions.length === 0) {
        document.getElementById('totalSeats').textContent = '0';
        document.getElementById('totalRevenue').textContent = '0.00';
        document.getElementById('totalAcquisitions').textContent = '0';
        document.getElementById('pendingItems').textContent = '0';
        return;
    }
    
    const totalSeats = acquisitions.reduce((sum, item) => sum + (item.no_of_seats || 0), 0);
    const totalRevenue = acquisitions.reduce((sum, item) => sum + (item.payable_amount || 0), 0);
    const pendingCount = acquisitions.filter(item => item.status === 'draft').length;
    
    document.getElementById('totalSeats').textContent = totalSeats;
    document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
    document.getElementById('totalAcquisitions').textContent = acquisitions.length;
    document.getElementById('pendingItems').textContent = pendingCount;
}

// ========== RESET FORM ==========
function resetForm() {
    console.log('Resetting form...');
    
    if (editingId && !confirm('Cancel editing and reset form?')) {
        return;
    }
    
    editingId = null;
    
    // Generate new SR number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    document.getElementById('srNumber').value = `SR${year}${month}${random}`;
    
    // Clear ONLY required fields, keep optional empty
    const clearIds = [
        'license', 'branch', 'airlinePnr', 'gdsPnr', 'airline',
        'noOfSeats', 'outboundDate', 'inboundDate', 'sector',
        'fare', 'taxes', 'issuanceDate'
    ];
    
    clearIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // Reset selects to defaults
    document.getElementById('investmentType').value = 'group_seats';
    document.getElementById('segment').value = 'domestic';
    document.getElementById('ticketingStatus').value = 'pending';
    document.getElementById('overallStatus').value = 'draft';
    document.getElementById('paymentPercentage').value = 100;
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('requestDate').value = today;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('timeLimit').value = nextWeek.toISOString().split('T')[0];
    
    // Clear calculated fields
    document.getElementById('payableAmount').value = '';
    document.getElementById('pnrAmount').value = '';
    document.getElementById('balanceTickets').value = '';
    
    // Update UI
    updateSubmitButton();
    updateTable();
    
    showSuccess('✅ Form reset. Fill basic details first, EMD can be added later.');
}

function cancelEdit() {
    if (editingId) {
        resetForm();
    }
}

function showLogin() {
    alert('Login will be added later.');
}

function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    const toast = new bootstrap.Toast(document.getElementById('successToast'));
    toast.show();
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    const toast = new bootstrap.Toast(document.getElementById('errorToast'));
    toast.show();
}

// Initialize
updateDashboard();