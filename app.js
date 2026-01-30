// Initialize Supabase
const supabaseUrl = 'https://ojlxkzkialguthdeiley.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHhremtpYWxndXRoZGVpbGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTE0MjQsImV4cCI6MjA4NTMyNzQyNH0.CYH4hRn4w87vvvskkHOQMyKONyDWnvF7_m5IOfgPR94';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ========== GLOBAL VARIABLES ==========
let acquisitions = [];
let editingId = null;

// ========== MAIN INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized');
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
    
    // Disable save button to prevent double click
    const saveBtn = document.querySelector('button[onclick="saveAcquisition()"]');
    const originalText = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...';
    }
    
    try {
        // Get only BASIC fields (others can be added later via edit)
        const formData = {
            // Basic required fields
            sr_number: document.getElementById('srNumber')?.value || '',
            request_date: document.getElementById('requestDate')?.value || new Date().toISOString().split('T')[0],
            airline_pnr: document.getElementById('airlinePnr')?.value || '',
            no_of_seats: parseInt(document.getElementById('noOfSeats')?.value) || 0,
            fare: parseFloat(document.getElementById('fare')?.value) || 0,
            time_limit: document.getElementById('timeLimit')?.value || '',
            
            // Optional basic fields
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
            
            // EMD fields - can be empty initially
            emd_refund_date: document.getElementById('emdRefundDate')?.value || null,
            first_emd_number: document.getElementById('emd1Number')?.value || null,
            first_emd_amount: document.getElementById('emd1Amount')?.value ? parseFloat(document.getElementById('emd1Amount').value) : null,
            first_emd_status: document.getElementById('emd1Status')?.value || null,
            first_emd_time_limit: document.getElementById('emd1TimeLimit')?.value || null,
            first_emd_issuance_date: document.getElementById('emd1IssuanceDate')?.value || null,
            first_emd_payment_percentage: document.getElementById('emd1PaymentPercent')?.value ? parseFloat(document.getElementById('emd1PaymentPercent').value) : null,
            
            // More EMD fields
            second_emd_number: document.getElementById('emd2Number')?.value || null,
            second_emd_amount: document.getElementById('emd2Amount')?.value ? parseFloat(document.getElementById('emd2Amount').value) : null,
            second_emd_time_limit: document.getElementById('emd2TimeLimit')?.value || null,
            third_emd_number: document.getElementById('emd3Number')?.value || null,
            third_emd_amount: document.getElementById('emd3Amount')?.value ? parseFloat(document.getElementById('emd3Amount').value) : null,
            third_emd_time_limit: document.getElementById('emd3TimeLimit')?.value || null,
            
            // Ticketing
            ticketing_status: document.getElementById('ticketingStatus')?.value || 'pending',
            no_of_tickets_issued: parseInt(document.getElementById('ticketsIssued')?.value) || 0,
            balance_tickets: parseInt(document.getElementById('balanceTickets')?.value) || 0,
            last_ticket_date: document.getElementById('lastTicketDate')?.value || null,
            
            // Status
            status: document.getElementById('overallStatus')?.value || 'draft',
            notes: document.getElementById('notes')?.value || null
        };

        console.log('Saving data:', formData);

        // Validate required fields
        if (!formData.sr_number || !formData.airline_pnr || !formData.time_limit) {
            throw new Error('SR Number, Airline PNR and Time Limit are required');
        }

        if (editingId) {
            // UPDATE existing record
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .update(formData)
                .eq('id', editingId)
                .select();
            
            if (error) {
                console.error('Update error:', error);
                throw error;
            }
            
            showSuccess('✅ Acquisition updated successfully! SR#: ' + formData.sr_number);
            editingId = null;
        } else {
            // INSERT new record
            const { data, error } = await supabaseClient
                .from('seat_acquisitions')
                .insert([formData])
                .select();
            
            if (error) {
                console.error('Insert error:', error);
                throw error;
            }
            
            showSuccess('✅ Acquisition saved successfully! SR#: ' + formData.sr_number);
        }
        
        // Reset and reload
        resetForm();
        loadAcquisitions();
        
    } catch (error) {
        console.error('Error in saveAcquisition:', error);
        showError('❌ Save failed: ' + (error.message || 'Unknown error'));
    } finally {
        // Re-enable save button
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText || '<i class="bi bi-save me-2"></i>Save Acquisition';
        }
    }
}

async function editAcquisition(id) {
    try {
        console.log('Editing acquisition:', id);
        
        const { data, error } = await supabaseClient
            .from('seat_acquisitions')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        editingId = id;
        
        // Fill form with existing data
        const fields = [
            { id: 'srNumber', value: data.sr_number },
            { id: 'requestDate', value: data.request_date },
            { id: 'investmentType', value: data.investment_type },
            { id: 'license', value: data.license_number || data.license || '' },
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
            if (element) {
                element.value = field.value || '';
            }
        });
        
        // Calculate derived fields
        calculateAmounts();
        calculateBalanceTickets();
        
        // Update button text
        const saveBtn = document.querySelector('button[onclick="saveAcquisition()"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Update Acquisition';
            saveBtn.className = 'btn btn-warning btn-lg';
        }
        
        // Show cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        
        // Scroll to form
        document.getElementById('acquireForm')?.scrollIntoView({ behavior: 'smooth' });
        
        showSuccess('✏️ Editing: ' + data.sr_number);
        
    } catch (error) {
        console.error('Error loading for edit:', error);
        showError('Failed to load for editing');
    }
}

async function deleteAcquisition(id, srNumber) {
    if (!confirm(`🗑️ Delete ${srNumber}?\n\nThis action cannot be undone!`)) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('seat_acquisitions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // If editing this record, reset form
        if (editingId === id) {
            editingId = null;
            resetForm();
        }
        
        showSuccess('🗑️ Deleted: ' + srNumber);
        
        // Reload data
        loadAcquisitions();
        
    } catch (error) {
        console.error('Error deleting:', error);
        showError('Failed to delete');
    }
}

async function loadAcquisitions() {
    try {
        console.log('Loading acquisitions...');
        
        const { data, error } = await supabaseClient
            .from('seat_acquisitions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        acquisitions = data || [];
        console.log('Loaded', acquisitions.length, 'acquisitions');
        
        updateTable();
        updateDashboard();
        
    } catch (error) {
        console.error('Error loading acquisitions:', error);
        acquisitions = [];
        updateTable();
    }
}

// ========== UI FUNCTIONS ==========
function updateTable() {
    const tableBody = document.getElementById('acquisitionsTable');
    if (!tableBody) {
        console.error('Table body not found!');
        return;
    }
    
    if (!acquisitions || acquisitions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                    <p class="mt-2 text-muted">No acquisitions yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    acquisitions.forEach(item => {
        const srNumber = item.sr_number || 'N/A';
        const airlinePnr = item.airline_pnr || '';
        const seats = item.no_of_seats || 0;
        const fare = item.fare ? parseFloat(item.fare).toFixed(2) : '0.00';
        const status = item.status || 'draft';
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
        const id = item.id || '';
        
        // Status styling
        let statusClass = 'status-draft';
        let statusText = 'Draft';
        if (status === 'approved') {
            statusClass = 'status-approved';
            statusText = 'Approved';
        } else if (status === 'pending') {
            statusClass = 'status-pending';
            statusText = 'Pending';
        }
        
        // Check if editing
        const isEditing = editingId === id;
        const rowClass = isEditing ? 'table-warning' : '';
        
        // Check EMD status
        const hasEMD = item.first_emd_number || item.second_emd_number || item.third_emd_number;
        const emdBadge = hasEMD 
            ? '<span class="badge bg-success ms-1" title="Has EMD">✓</span>' 
            : '<span class="badge bg-secondary ms-1" title="No EMD yet">…</span>';
        
        html += `
            <tr class="${rowClass}">
                <td>
                    <strong>${srNumber}</strong>
                    ${isEditing ? '<span class="badge bg-warning ms-1">Editing</span>' : ''}
                    ${emdBadge}
                </td>
                <td>${airlinePnr}</td>
                <td>${seats}</td>
                <td>${fare}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${date}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="editAcquisition('${id}')" 
                                title="Edit / Add EMD">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" 
                                onclick="deleteAcquisition('${id}', '${srNumber}')" 
                                title="Delete">
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
    console.log('Resetting form...');
    
    // Exit edit mode
    editingId = null;
    
    // Generate new SR number
    generateSRNumber();
    
    // Clear form fields
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
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('requestDate').value = today;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('timeLimit').value = nextWeek.toISOString().split('T')[0];
    
    // Clear calculated fields
    calculateAmounts();
    calculateBalanceTickets();
    
    // Reset button
    const saveBtn = document.querySelector('button[onclick="saveAcquisition()"]');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-save me-2"></i>Save Acquisition';
        saveBtn.className = 'btn btn-primary btn-lg';
    }
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    // Update table
    updateTable();
    
    showSuccess('✅ Form reset. Ready for new entry.');
}

function cancelEdit() {
    if (editingId) {
        resetForm();
    }
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

// Initialize
loadAcquisitions();