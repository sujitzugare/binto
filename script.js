function domReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function loadFromLocalStorage(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function switchToOption(optionId) {
    const options = ["option1", "option2", "option3", "option4", "option5"];
    options.forEach(id => {
        document.getElementById(id).style.display = id === optionId ? "block" : "none";
    });
}

domReady(function () {
    let productDetails = loadFromLocalStorage('productDetails') || {};
    let cart = [];
    let upiDetails = loadFromLocalStorage('upiDetails') || {};
    let billHistory = loadFromLocalStorage('billHistory') || [];

    function onScanSuccessOption1(decodeText, decodeResult) {
        document.getElementById('barcode').value = decodeText;
        if (productDetails[decodeText]) {
            document.getElementById('product-name').value = productDetails[decodeText].name;
            document.getElementById('product-price').value = productDetails[decodeText].price;
        } else {
            document.getElementById('product-name').value = '';
            document.getElementById('product-price').value = '';
        }
    }

    function onScanSuccessOption2(decodeText, decodeResult) {
        if (productDetails[decodeText]) {
            const product = productDetails[decodeText];
            const item = cart.find(item => item.code === decodeText);

            if (item) {
                item.quantity += 1;
            } else {
                cart.push({ code: decodeText, quantity: 1 });
            }

            displayCart();
        } else {
            showNotification("Unknown product: " + decodeText, "error");
        }
    }

    function displayCart() {
        const cartDiv = document.getElementById('cart');
        cartDiv.innerHTML = '';

        cart.forEach((item, index) => {
            const product = productDetails[item.code];
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = `
                ${item.code} - ₹${product.price} - ${product.name} 
                Quantity: <input type="number" value="${item.quantity}" min="1" data-index="${index}">
            `;
            cartDiv.appendChild(itemDiv);
        });

        calculateTotal();
    }

    function calculateTotal() {
        let total = 0;

        cart.forEach(item => {
            const product = productDetails[item.code];
            total += product.price * item.quantity;
        });

        document.getElementById('total').innerText = `Total: ₹${total}`;
    }

    document.getElementById('cart').addEventListener('input', (event) => {
        const input = event.target;
        const index = input.dataset.index;
        const newQuantity = parseInt(input.value, 10);

        if (!isNaN(newQuantity) && newQuantity > 0) {
            cart[index].quantity = newQuantity;
            calculateTotal();
        }
    });

    document.getElementById('save-barcode').addEventListener('click', () => {
        const barcode = document.getElementById('barcode').value;
        const productName = document.getElementById('product-name').value;
        const productPrice = parseFloat(document.getElementById('product-price').value);

        if (barcode && productName && !isNaN(productPrice)) {
            productDetails[barcode] = { name: productName, price: productPrice };
            saveToLocalStorage('productDetails', productDetails);
            showNotification('Product details saved.', 'success');
        } else {
            showNotification('Please fill in all fields.', 'error');
        }
    });

    document.getElementById('generate-bill').addEventListener('click', () => {
        const totalAmount = document.getElementById('total').innerText.split('₹')[1];

        if (!upiDetails.upiId || !upiDetails.name || !upiDetails.note) {
            showNotification('Please set up your UPI details in the UPI QR Code section first.', 'error');
            return;
        }

        const upiUrl = `upi://pay?pa=${upiDetails.upiId}&pn=${upiDetails.name}&am=${totalAmount}&cu=INR&tn=${upiDetails.note}`;

        const qrCode = new QRCodeStyling({
            width: 300,
            height: 300,
            data: upiUrl,
            dotsOptions: {
                color: "#000",
                type: "rounded"
            },
            backgroundOptions: {
                color: "#fff",
            }
        });

        document.getElementById('bill-qr-code').innerHTML = "";
        qrCode.append(document.getElementById('bill-qr-code'));

        const bill = {
            date: new Date().toLocaleString(),
            items: [...cart],
            total: totalAmount
        };
        billHistory.push(bill);
        saveToLocalStorage('billHistory', billHistory);

        showNotification(`Total Bill: ₹${totalAmount}`, 'success');

        cart = [];
        displayCart();
        document.getElementById('print-bill').disabled = false;
    });

    document.getElementById('print-bill').addEventListener('click', () => {
        const totalAmount = document.getElementById('total').innerText.split('₹')[1];
        const qrCodeImage = document.getElementById('bill-qr-code').innerHTML;

        let itemsList = '';
        cart.forEach(item => {
            const product = productDetails[item.code];
            itemsList += `
                <p><strong>Item:</strong> ${product.name} (x${item.quantity}) - ₹${product.price * item.quantity}</p>
            `;
        });

        const printContent = `
            <div style="text-align:center; font-family:sans-serif;">
                <h2>UPI Payment Details</h2>
                <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
                <p><strong>UPI ID:</strong> ${upiDetails.upiId}</p>
                <p><strong>Name:</strong> ${upiDetails.name}</p>
                <p><strong>Note:</strong> ${upiDetails.note}</p>
                <h3>Items:</h3>
                ${itemsList}
                <div>${qrCodeImage}</div>
            </div>
        `;

        const printWindow = window.open('', '', 'width=600,height=400');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    });

    document.getElementById('qrForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const upiId = document.getElementById('upi_id').value;
        const name = document.getElementById('name').value;
        const note = document.getElementById('note').value;

        upiDetails = { upiId, name, note };
        saveToLocalStorage('upiDetails', upiDetails);

        showNotification('UPI details saved.', 'success');
    });

    document.getElementById('download-data').addEventListener('click', () => {
        const data = {
            productDetails,
            cart,
            upiDetails
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.getElementById('upload-data').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = JSON.parse(e.target.result);
                if (data.productDetails) productDetails = data.productDetails;
                if (data.cart) cart = data.cart;
                if (data.upiDetails) upiDetails = data.upiDetails;
                saveToLocalStorage('productDetails', productDetails);
                saveToLocalStorage('upiDetails', upiDetails);
                showNotification('Data imported successfully.', 'success');
            };
            reader.readAsText(file);
        }
    });

    document.getElementById('option5-button').addEventListener('click', () => {
        const billHistoryContainer = document.getElementById('bill-history');
        billHistoryContainer.innerHTML = '';

        if (billHistory.length > 0) {
            billHistory.forEach((bill, index) => {
                let itemsList = '';
                bill.items.forEach(item => {
                    const product = productDetails[item.code];
                    itemsList += `${product.name} (x${item.quantity}) - ₹${product.price * item.quantity}<br>`;
                });

                billHistoryContainer.innerHTML += `
                    <div class="bill">
                        <h3>Bill ${index + 1}</h3>
                        <p><strong>Date/Time:</strong> ${bill.date}</p>
                        <p><strong>Items:</strong><br>${itemsList}</p>
                        <p><strong>Total:</strong> ₹${bill.total}</p>
                        <hr>
                    </div>
                `;
            });
        } else {
            billHistoryContainer.innerHTML = '<p>No bills found.</p>';
        }
    });

    let html5QrcodeScannerOption1 = new Html5QrcodeScanner(
        "my-qr-reader-option1",
        {
            fps: 30,
            qrbox: { width: 250, height: 250 },
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        }
    );
    html5QrcodeScannerOption1.render(onScanSuccessOption1);

    let html5QrcodeScannerOption2 = new Html5QrcodeScanner(
        "my-qr-reader-option2",
        {
            fps: 30,
            qrbox: { width: 250, height: 250 },
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        }
    );
    html5QrcodeScannerOption2.render(onScanSuccessOption2);
});
