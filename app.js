// Initialize Supabase
const supabaseUrl = 'https://ojlxkzkialguthdeiley.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHhremtpYWxndXRoZGVpbGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTE0MjQsImV4cCI6MjA4NTMyNzQyNH0.CYH4hRn4w87vvvskkHOQMyKONyDWnvF7_m5IOfgPR94';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ========== GLOBAL VARIABLES ==========
let acquisitions = [];
let editingId = null; // Track which record is being edited

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
    if (editingId) return; // Don't regenerate if editing
    
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
// ========== DATABASE FUNCTIONS ==========
async function saveAcquisition() {
    try {
        // Get all form values
        const formData = {
            sr_number: document.getElementById('srNumber').value,
            request_date: document.getElementById('requestDate').value,
            investment_type: document.getElementById('investmentType').value,
            license: document.getElementById('license').value,
            branch: document.getElementById('branch').value,
            airline_pnr: document.getElementById('airlinePnr').value,
            gds_pnr: document.getElementById('gdsPnr').value || null,
            segment: document.getElementById('segment').value,
            airline: document.getElementById('airline').value,
            no_of_seats: parseInt(document.getElementById('noOfSeats').value),
            outbound_date: document.getElementById('outboundDate').value || null,
            inbound_date: document.getElementById('inboundDate').value || null,
            sector: document.getElementById('sector').value,
            
            // Financial
            fare: parseFloat(document.getElementById('fare').value),
            taxes: parseFloat(document.getElementById('taxes').value),
            payable_amount: parseFloat(document.getElementById('payableAmount').value),
            pnr_amount: parseFloat(document.getElementById('pnrAmount').value),
            issuance_date: document.getElementById('issuanceDate').value || null,
            time_limit: document.getElementById('timeLimit').value,
            payment_percentage: parseFloat(document.getElementById('paymentPercentage').value),
            
            // 1st EMD
            emd_refund_date: document.getElementById('emdRefundDate').value || null,
            first_emd_number: document.getElementById('emd1Number').value || null,
            first_emd_amount: document.getElementById('emd1Amount').value ? parseFloat(document.getElementById('emd1Amount').value) : null,
            first_emd_status: document.getElementById('emd1Status').value || null,
            first_emd_time_limit: document.getElementById('emd1TimeLimit').value || null,
            first_emd_issuance_date: document.getElementById('emd1IssuanceDate').value || null,
            first_emd_payment_percentage: document.getElementById('emd1PaymentPercent').value ? parseFloat(document.getElementById('emd1PaymentPercent').value) : null,
            
            // 2nd EMD
            second_emd_number: document.getElementById('emd2Number').value || null,
            second_emd_amount: document.getElementById('emd2Amount').value ? parseFloat(document.getElementById('emd2Amount').value) : null,
            second_emd_time_limit: document.getElementById('emd2TimeLimit').value || null,
            
            // 3rd EMD
            third_emd_number: document.getElementById('emd3Number').value || null,
            third_emd_amount: document.getElementById('emd3Amount').value ? parseFloat(document.getElementById('emd3Amount').value) : null,
            third_emd_time_limit: document.getElementById('emd3TimeLimit').value || null,
            
            // Ticketing
            ticketing_status: document.getElementById('ticketingStatus').value,
            no_of_tickets_issued: parseInt(document.getElementById('ticketsIssued').value) || 0,
            balance_tickets: parseInt(document.getElementById('balanceTickets').value) || 0,
            last_ticket_date: document.getElementById('lastTicketDate').value || null,
            
            // Overall
            status: document.getElementById('overallStatus').value,
            notes: document.getElementById('notes').value || null,
            
            updated_at: new Date().toISOString()
        };

        console.log('Saving data:', formData);

        if (editingId) {
            // UPDATE existing record
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .update(formData)
                .eq('id', editingId)
                .select();
            
            if (error) throw error;
            
            showSuccess('Acquisition updated successfully! SR#: ' + formData.sr_number);
            editingId = null; // Reset editing mode
        } else {
            // INSERT new record
            formData.created_at = new Date().toISOString();
            
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .insert([formData])
                .select();
            
            if (error) throw error;
            
            showSuccess('Acquisition saved successfully! SR#: ' + formData.sr_number);
        }
        
        // Reset form and reload data
        resetForm();
        loadAcquisitions();
        updateDashboard();
        
    } catch (error) {
        console.error('Error saving:', error);
        showError('Failed to save: ' + error.message);
    }
}

// Load data for editing
async function editAcquisition(id) {
    try {
        const { data, error } = await supabaseClient
            .from('seat_acquisitions')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Store editing ID
        editingId = id;
        
        // Fill form with data
        document.getElementById('srNumber').value = data.sr_number;
        document.getElementById('requestDate').value = data.request_date;
        document.getElementById('investmentType').value = data.investment_type;
        document.getElementById('license').value = data.license;
        document.getElementById('branch').value = data.branch;
        document.getElementById('airlinePnr').value = data.airline_pnr;
        document.getElementById('gdsPnr').value = data.gds_pnr || '';
        document.getElementById('segment').value = data.segment;
        document.getElementById('airline').value = data.airline;
        document.getElementById('noOfSeats').value = data.no_of_seats;
        document.getElementById('outboundDate').value = data.outbound_date || '';
        document.getElementById('inboundDate').value = data.inbound_date || '';
        document.getElementById('sector').value = data.sector;
        
        // Financial
        document.getElementById('fare').value = data.fare;
        document.getElementById('taxes').value = data.taxes;
        document.getElementById('paymentPercentage').value = data.payment_percentage;
        document.getElementById('issuanceDate').value = data.issuance_date || '';
        document.getElementById('timeLimit').value = data.time_limit;
        
        // 1st EMD
        document.getElementById('emdRefundDate').value = data.emd_refund_date || '';
        document.getElementById('emd1Number').value = data.first_emd_number || '';
        document.getElementById('emd1Amount').value = data.first_emd_amount || '';
        document.getElementById('emd1Status').value = data.first_emd_status || '';
        document.getElementById('emd1TimeLimit').value = data.first_emd_time_limit || '';
        document.getElementById('emd1IssuanceDate').value = data.first_emd_issuance_date || '';
        document.getElementById('emd1PaymentPercent').value = data.first_emd_payment_percentage || '';
        
        // 2nd EMD
        document.getElementById('emd2Number').value = data.second_emd_number || '';
        document.getElementById('emd2Amount').value = data.second_emd_amount || '';
        document.getElementById('emd2TimeLimit').value = data.second_emd_time_limit || '';
        
        // 3rd EMD
        document.getElementById('emd3Number').value = data.third_emd_number || '';
        document.getElementById('emd3Amount').value = data.third_emd_amount || '';
        document.getElementById('emd3TimeLimit').value = data.third_emd_time_limit || '';
        
        // Ticketing
        document.getElementById('ticketingStatus').value = data.ticketing_status;
        document.getElementById('ticketsIssued').value = data.no_of_tickets_issued;
        document.getElementById('lastTicketDate').value = data.last_ticket_date || '';
        
        // Overall
        document.getElementById('overallStatus').value = data.status;
        document.getElementById('notes').value = data.notes || '';
        
        // Calculate amounts
        calculateAmounts();
        calculateBalanceTickets();
        
        // Update button
        updateSubmitButton();
        
        // Scroll to form
        document.getElementById('acquireForm').scrollIntoView({ behavior: 'smooth' });
        
        showSuccess('Editing mode: ' + data.sr_number);
        
    } catch (error) {
        console.error('Error loading for edit:', error);
        showError('Failed to load for editing: ' + error.message);
    }
}

// Delete acquisition
async function deleteAcquisition(id, srNumber) {
    if (!confirm(`Are you sure you want to delete acquisition ${srNumber}?\n\nThis action cannot be undone!`)) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('seat_acquisitions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // If editing this record, cancel edit mode
        if (editingId === id) {
            editingId = null;
            resetForm();
            updateSubmitButton();
        }
        
        showSuccess('Acquisition deleted successfully: ' + srNumber);
        
        // Reload data
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
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No acquisitions yet. Submit a form above!</td></tr>';
        return;
    }
    
    let html = '';
    acquisitions.forEach(item => {
        const statusClass = item.status === 'approved' ? 'status-approved' : 
                          item.status === 'draft' ? 'status-draft' : 'status-pending';
        
        // Check if this item is being edited
        const isEditing = editingId === item.id;
        const editingClass = isEditing ? 'table-warning' : '';
        
        html += `
            <tr class="${editingClass}">
                <td><strong>${item.sr_number}</strong> ${isEditing ? '✏️' : ''}</td>
                <td>${item.airline_pnr}</td>
                <td>${item.no_of_seats}</td>
                <td>${item.fare?.toFixed(2) || '0.00'}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editAcquisition('${item.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
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

function viewDetails(srNumber) {
    const item = acquisitions.find(a => a.sr_number === srNumber);
    if (item) {
        alert(`Details for ${srNumber}:\n\n` +
              `Airline PNR: ${item.airline_pnr}\n` +
              `Seats: ${item.no_of_seats}\n` +
              `Fare: ${item.fare}\n` +
              `Status: ${item.status}\n` +
              `Created: ${new Date(item.created_at).toLocaleString()}`);
    }
}

function resetForm() {
    // Reset editing mode
    editingId = null;
    
    // Reset all form fields
    document.querySelectorAll('#acquireForm input, #acquireForm select, #acquireForm textarea').forEach(element => {
        if (element.id === 'requestDate' || element.id === 'timeLimit' || element.id === 'paymentPercentage') {
            // Keep default values for these
            return;
        }
        
        if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = false;
        } else if (element.tagName === 'SELECT') {
            element.selectedIndex = 0;
        } else {
            element.value = '';
        }
    });
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('requestDate').value = today;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('timeLimit').value = nextWeek.toISOString().split('T')[0];
    
    // Set default values
    document.getElementById('paymentPercentage').value = 100;
    document.getElementById('ticketingStatus').value = 'pending';
    document.getElementById('overallStatus').value = 'draft';
    
    // Generate new SR number
    generateSRNumber();
    
    // Calculate
    calculateAmounts();
    calculateBalanceTickets();
    
    // Update button
    updateSubmitButton();
    
    // Reset to first tab
    const firstTab = document.querySelector('#basic-tab');
    if (firstTab) {
        firstTab.click();
    }
    
    // Clear any editing highlights
    updateTable();
}

function cancelEdit() {
    if (editingId && confirm('Cancel editing? Any unsaved changes will be lost.')) {
        resetForm();
    }
}

function showLogin() {
    alert('Login functionality will be added in next phase.\nFor now, you can use the form without login.');
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

// Initialize dashboard
updateDashboard();