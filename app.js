// Store all products
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = null;
let sortDirection = 'asc'; // 'asc' or 'desc'
let productModal = null;
let createProductModal = null;
let currentProduct = null;

// LocalStorage key
const STORAGE_KEY = 'platzi_products_data';

// Load from localStorage
function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing localStorage:', e);
            return null;
        }
    }
    return null;
}

// Save to localStorage
function saveToStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('Saved to localStorage:', data.length, 'products');
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Fetch products from API
async function loadProducts() {
    try {
        // Try to load from localStorage first
        const storedProducts = loadFromStorage();
        if (storedProducts && storedProducts.length > 0) {
            console.log('Loaded from localStorage:', storedProducts.length, 'products');
            allProducts = storedProducts;
            filteredProducts = storedProducts;
            displayProducts();
            return;
        }
        
        // If no localStorage, fetch from API
        const response = await fetch('https://api.escuelajs.co/api/v1/products');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const products = await response.json();
        allProducts = products;
        filteredProducts = products;
        
        // Save initial data to localStorage
        saveToStorage(allProducts);
        
        displayProducts();
        
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('errorMessage').textContent = 'Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.';
    }
}

// Display products in table with pagination
function displayProducts() {
    let products = [...filteredProducts];
    
    // Apply sorting if column is selected
    if (sortColumn) {
        products.sort((a, b) => {
            let valueA, valueB;
            
            if (sortColumn === 'price') {
                valueA = a.price;
                valueB = b.price;
            } else if (sortColumn === 'title') {
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
            }
            
            if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    const tableBody = document.getElementById('productTableBody');
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentProducts = products.slice(startIndex, endIndex);
    
    // Update page info
    document.getElementById('pageInfo').textContent = 
        `Hiển thị ${startIndex + 1}-${endIndex} trong tổng ${totalItems} sản phẩm`;

    currentProducts.forEach(product => {
        const row = document.createElement('tr');
        row.className = 'product-row';
        
        // Add tooltip with description
        const description = product.description || 'Không có mô tả';
        row.setAttribute('data-bs-toggle', 'tooltip');
        row.setAttribute('data-bs-placement', 'left');
        row.setAttribute('data-bs-html', 'true');
        row.setAttribute('data-bs-title', `<strong>${product.title}</strong><br>${description}`);
        
        // Get category name
        const categoryName = product.category?.name || 'N/A';
        
        // Get first image or placeholder
        let imageUrl = '';
        let showPlaceholder = false;
        
        if (product.images && product.images.length > 0) {
            imageUrl = product.images[0];
            // Clean URL if needed
            imageUrl = imageUrl.replace(/[\[\]"']/g, '').trim();
        } else {
            showPlaceholder = true;
        }
        
        let imageHtml = '';
        if (showPlaceholder || !imageUrl || !imageUrl.startsWith('http')) {
            // Show colored placeholder with product ID
            imageHtml = `<div class="image-placeholder">ID: ${product.id}</div>`;
        } else {
            // Try to load image with referrerPolicy to bypass some blocking
            imageHtml = `<img src="${imageUrl}" 
                             alt="${product.title}" 
                             class="product-image" 
                             referrerpolicy="no-referrer"
                             crossorigin="anonymous"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                             loading="lazy">
                        <div class="image-placeholder" style="display:none;">ID: ${product.id}</div>`;
        }
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.title}</td>
            <td class="price-text">$${product.price}</td>
            <td>
                <span class="badge bg-primary category-badge">${categoryName}</span>
            </td>
            <td>
                ${imageHtml}
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add click event to open modal
        row.addEventListener('click', () => {
            showProductDetail(product);
        });
    });

    // Hide loading, show table
    document.getElementById('loading').style.display = 'none';
    document.getElementById('tableWrapper').style.display = 'block';
    
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            delay: { show: 200, hide: 100 },
            trigger: 'hover'
        });
    });
    
    // Generate pagination buttons
    generatePagination(totalPages);
    
    // Update sort icons
    updateSortIcons();
}

// Update sort icons in table header
function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(th => {
        const column = th.getAttribute('data-column');
        const icon = th.querySelector('.sort-icon');
        
        th.classList.remove('active');
        
        if (column === sortColumn) {
            th.classList.add('active');
            if (sortDirection === 'asc') {
                icon.className = 'bi bi-arrow-up sort-icon';
            } else {
                icon.className = 'bi bi-arrow-down sort-icon';
            }
        } else {
            icon.className = 'bi bi-arrow-down-up sort-icon';
        }
    });
}

// Sort products by column
function sortProducts(column) {
    if (sortColumn === column) {
        // Toggle direction if same column
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
        sortColumn = column;
        sortDirection = 'asc';
    }
    currentPage = 1; // Reset to first page
    displayProducts();
}

// Export current view to CSV
function exportToCSV() {
    let products = [...filteredProducts];
    
    // Apply same sorting as display
    if (sortColumn) {
        products.sort((a, b) => {
            let valueA, valueB;
            
            if (sortColumn === 'price') {
                valueA = a.price;
                valueB = b.price;
            } else if (sortColumn === 'title') {
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
            }
            
            if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // Get current page products
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, products.length);
    const currentProducts = products.slice(startIndex, endIndex);
    
    // Create CSV content
    let csv = 'ID,Title,Price,Category,Image URL,Description\n';
    
    currentProducts.forEach(product => {
        const id = product.id;
        const title = `"${(product.title || '').replace(/"/g, '""')}"`;
        const price = product.price;
        const category = `"${(product.category?.name || 'N/A').replace(/"/g, '""')}"`;
        const imageUrl = product.images && product.images.length > 0 ? product.images[0].replace(/[\[\]"']/g, '').trim() : '';
        const description = `"${(product.description || '').replace(/"/g, '""')}"`;
        
        csv += `${id},${title},${price},${category},${imageUrl},${description}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const date = new Date();
    const filename = `products_page${currentPage}_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show product detail in modal
function showProductDetail(product) {
    currentProduct = product;
    
    // Populate form
    document.getElementById('productId').value = product.id;
    document.getElementById('productTitle').value = product.title;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productCategory').value = product.category?.name || 'N/A';
    
    // Set image
    let imageUrl = '';
    if (product.images && product.images.length > 0) {
        imageUrl = product.images[0].replace(/[\[\]"']/g, '').trim();
    }
    document.getElementById('productImageUrl').value = imageUrl;
    document.getElementById('modalProductImage').src = imageUrl || 'https://via.placeholder.com/300';
    
    // Hide message
    document.getElementById('updateMessage').style.display = 'none';
    
    // Show modal
    productModal.show();
}

// Update product via API
async function updateProduct() {
    const id = document.getElementById('productId').value;
    const title = document.getElementById('productTitle').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value;
    const imageUrl = document.getElementById('productImageUrl').value;
    
    const updateData = {
        title: title,
        price: price,
        description: description
    };
    
    // Show loading
    const saveBtn = document.getElementById('saveProduct');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
    
    try {
        const response = await fetch(`https://api.escuelajs.co/api/v1/products/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);
        
        if (response.ok || response.status === 200) {
            // Update in local data
            const index = allProducts.findIndex(p => p.id == id);
            if (index !== -1) {
                allProducts[index] = { 
                    ...allProducts[index], 
                    title: title,
                    price: price,
                    description: description
                };
                
                // Save to localStorage
                saveToStorage(allProducts);
                
                // Update filtered products
                const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
                filteredProducts = allProducts.filter(product => 
                    product.title.toLowerCase().includes(searchTerm)
                );
            }
            
            // Show success message
            showMessage('Cập nhật sản phẩm thành công!', 'success');
            
            // Refresh display after 1.5 seconds
            setTimeout(() => {
                displayProducts();
                productModal.hide();
            }, 1500);
        } else {
            // If API returns error, still update locally
            console.warn('API returned error, updating locally only');
            
            const index = allProducts.findIndex(p => p.id == id);
            if (index !== -1) {
                allProducts[index] = { 
                    ...allProducts[index], 
                    title: title,
                    price: price,
                    description: description
                };
                
                // Save to localStorage
                saveToStorage(allProducts);
                
                const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
                filteredProducts = allProducts.filter(product => 
                    product.title.toLowerCase().includes(searchTerm)
                );
            }
            
            showMessage('Cập nhật local thành công!', 'warning');
            
            setTimeout(() => {
                displayProducts();
                productModal.hide();
            }, 1500);
        }
    } catch (error) {
        console.error('Error updating product:', error);
        
        // Even if API fails, update locally
        const index = allProducts.findIndex(p => p.id == id);
        if (index !== -1) {
            allProducts[index] = { 
                ...allProducts[index], 
                title: title,
                price: price,
                description: description
            };
            
            // Save to localStorage
            saveToStorage(allProducts);
            
            const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
            filteredProducts = allProducts.filter(product => 
                product.title.toLowerCase().includes(searchTerm)
            );
        }
        
        showMessage('Đã cập nhật dữ liệu local!', 'info');
        
        setTimeout(() => {
            displayProducts();
            productModal.hide();
        }, 1500);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Show message in modal
function showMessage(message, type) {
    const messageDiv = document.getElementById('updateMessage');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
}

// Show create product modal
function showCreateProductModal() {
    // Reset form
    document.getElementById('createProductForm').reset();
    document.getElementById('createMessage').style.display = 'none';
    
    // Show modal
    createProductModal.show();
}

// Create new product via API
async function createProduct() {
    const title = document.getElementById('newProductTitle').value.trim();
    const price = parseFloat(document.getElementById('newProductPrice').value);
    const description = document.getElementById('newProductDescription').value.trim();
    const categoryId = parseInt(document.getElementById('newProductCategoryId').value);
    const imageUrl = document.getElementById('newProductImageUrl').value.trim();
    
    // Validation
    if (!title || !price || !categoryId || !imageUrl) {
        showCreateMessage('Vui lòng điền đầy đủ các trường bắt buộc!', 'danger');
        return;
    }
    
    const newProductData = {
        title: title,
        price: price,
        description: description || 'No description',
        categoryId: categoryId,
        images: [imageUrl]
    };
    
    // Show loading
    const submitBtn = document.getElementById('submitCreateProduct');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo...';
    
    try {
        const response = await fetch('https://api.escuelajs.co/api/v1/products/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newProductData)
        });
        
        console.log('Create Response status:', response.status);
        const responseData = await response.json();
        console.log('Create Response data:', responseData);
        
        if (response.ok || response.status === 201) {
            // Add to local data
            const newProduct = responseData;
            allProducts.push(newProduct); // Add to end
            
            // Save to localStorage
            saveToStorage(allProducts);
            
            // Update filtered products
            const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
            filteredProducts = allProducts.filter(product => 
                product.title.toLowerCase().includes(searchTerm)
            );
            
            // Show success message
            showCreateMessage('Tạo sản phẩm thành công!', 'success');
            
            // Refresh display and close modal after 1.5 seconds
            setTimeout(() => {
                currentPage = 1; // Go to first page
                displayProducts();
                createProductModal.hide();
            }, 1500);
        } else {
            // API error but create mock product locally
            const mockProduct = {
                id: getNextId(),
                title: title,
                price: price,
                description: description || 'No description',
                category: { 
                    id: categoryId, 
                    name: getCategoryName(categoryId) 
                },
                images: [imageUrl]
            };
            
            allProducts.push(mockProduct);
            
            // Save to localStorage
            saveToStorage(allProducts);
            
            const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
            filteredProducts = allProducts.filter(product => 
                product.title.toLowerCase().includes(searchTerm)
            );
            
            showCreateMessage('Tạo sản phẩm local thành công!', 'warning');
            
            setTimeout(() => {
                currentPage = 1;
                displayProducts();
                createProductModal.hide();
            }, 1500);
        }
    } catch (error) {
        console.error('Error creating product:', error);
        
        // Create mock product locally
        const mockProduct = {
            id: getNextId(),
            title: title,
            price: price,
            description: description || 'No description',
            category: { 
                id: categoryId, 
                name: getCategoryName(categoryId) 
            },
            images: [imageUrl]
        };
        
        allProducts.push(mockProduct);
        
        // Save to localStorage
        saveToStorage(allProducts);
        
        const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
        filteredProducts = allProducts.filter(product => 
            product.title.toLowerCase().includes(searchTerm)
        );
        
        showCreateMessage('Đã tạo sản phẩm local!', 'info');
        
        setTimeout(() => {
            currentPage = 1;
            displayProducts();
            createProductModal.hide();
        }, 1500);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Show message in create modal
function showCreateMessage(message, type) {
    const messageDiv = document.getElementById('createMessage');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
}

// Get category name by ID
function getCategoryName(categoryId) {
    const categories = {
        1: 'Clothes',
        2: 'Electronics',
        3: 'Furniture',
        4: 'Shoes',
        5: 'Miscellaneous'
    };
    return categories[categoryId] || 'Unknown';
}

// Get next available ID
function getNextId() {
    if (allProducts.length === 0) return 1;
    const maxId = Math.max(...allProducts.map(p => p.id));
    return maxId + 1;
}

// Generate pagination buttons
function generatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}"><i class="bi bi-chevron-left"></i> Trước</a>`;
    pagination.appendChild(prevLi);
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
        pagination.appendChild(firstLi);
        
        if (startPage > 2) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'page-item disabled';
            dotsLi.innerHTML = `<span class="page-link">...</span>`;
            pagination.appendChild(dotsLi);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'page-item disabled';
            dotsLi.innerHTML = `<span class="page-link">...</span>`;
            pagination.appendChild(dotsLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
        pagination.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Sau <i class="bi bi-chevron-right"></i></a>`;
    pagination.appendChild(nextLi);
    
    // Add click handlers
    pagination.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.currentTarget.getAttribute('data-page'));
            if (page > 0 && page <= totalPages) {
                currentPage = page;
                displayProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// Filter products by search term
function filterProducts(searchTerm) {
    filteredProducts = allProducts.filter(product => 
        product.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    currentPage = 1; // Reset to first page
    displayProducts();
    
    // Update search result text
    const resultText = document.getElementById('searchResult');
    if (searchTerm) {
        resultText.textContent = `Tìm thấy ${filteredProducts.length} sản phẩm`;
    } else {
        resultText.textContent = '';
    }
}

// Load products when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    
    // Initialize modals
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    createProductModal = new bootstrap.Modal(document.getElementById('createProductModal'));
    
    // Setup search functionality
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    
    // Real-time search as user types
    searchInput.addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });
    
    // Clear search button
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        filterProducts('');
        searchInput.focus();
    });
    
    // Items per page change
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1; // Reset to first page
        displayProducts();
    });
    
    // Sort functionality
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-column');
            sortProducts(column);
        });
    });
    
    // Export CSV functionality
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    
    // Save product button
    document.getElementById('saveProduct').addEventListener('click', updateProduct);
    
    // Create product button
    document.getElementById('createProduct').addEventListener('click', showCreateProductModal);
    
    // Submit create product button
    document.getElementById('submitCreateProduct').addEventListener('click', createProduct);
    
    // Clear storage and reload
    document.getElementById('clearStorage').addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa tất cả thay đổi và tải lại dữ liệu gốc từ API?')) {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Cleared localStorage');
            location.reload();
        }
    });
});
