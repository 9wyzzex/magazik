document.addEventListener('DOMContentLoaded', function() {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Данные о товарах (остаются) ---
    const products = [
        { id: 'sofa001', name: 'Уютный Диван "Комфорт"', description: 'Мягкий и стильный диван.', price: 25990, image: 'images/1.jpg' },
        { id: 'table002', name: 'Обеденный Стол "Сканди"', description: 'Прочный стол из массива дуба.', price: 12500, image: 'images/2.jpg' },
        { id: 'chair003', name: 'Стул "Лофт Дизайн"', description: 'Металлический каркас.', price: 4800, image: 'images/3.jpg' },
        { id: 'bed004', name: 'Кровать "Сладкий Сон"', description: 'Двуспальная кровать.', price: 18900, image: 'images/4.jpg'}
    ];

    // --- Корзина ---
    let cart = []; // { id, name, price, quantity, image }

    // --- Элементы DOM ---
    const productCatalog = document.getElementById('product-catalog');
    const cartCountHeaderEl = document.getElementById('cart-count-header');
    
    const cartModal = document.getElementById('cart-modal');
    const closeCartModalBtn = cartModal.querySelector('.close-modal-btn');
    const viewCartButton = document.getElementById('view-cart-button');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartModalTotalEl = document.getElementById('cart-modal-total');
    const checkoutButton = document.getElementById('checkout-button');
    const closeAppButton = document.getElementById('close-app-button');

    // --- Отображение товаров в каталоге (остается, только обновлен HTML) ---
    function renderProducts() {
        productCatalog.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <div class="product-footer">
                    <p class="price">${product.price.toLocaleString('ru-RU')} руб.</p>
                    <button class="add-to-cart-btn" data-product-id="${product.id}">Добавить в корзину</button>
                </div>
            `;
            productCatalog.appendChild(card);
        });
    }

    // --- Обновление общего состояния корзины (счетчики, кнопки) ---
    function updateCartState() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        cartCountHeaderEl.textContent = totalItems;
        cartModalTotalEl.textContent = totalPrice.toLocaleString('ru-RU');
        
        checkoutButton.disabled = totalItems === 0;

        // Управляем основной кнопкой Telegram (если корзина пуста, не показываем)
        if (totalItems > 0) {
            // Главную кнопку Telegram можно использовать как дубликат "Оформить заказ",
            // либо для другого действия. Пока оставим ее для оформления из каталога.
            // tg.MainButton.setText(`Оформить заказ (${totalPrice.toLocaleString('ru-RU')} руб.)`);
            // tg.MainButton.show();
            // Чтобы избежать путаницы, пока скроем ее, если есть модальное окно корзины.
            // Лучше использовать кнопку внутри модального окна для оформления.
            tg.MainButton.hide();
        } else {
            tg.MainButton.hide();
            if (cartModal.style.display === 'block') { // Если модальное окно открыто и корзина стала пустой
                 cartItemsContainer.innerHTML = '<p class="empty-cart-message">Ваша корзина пуста.</p>';
            }
        }
    }

    // --- Рендеринг товаров ВНУТРИ МОДАЛЬНОГО ОКНА КОРЗИНЫ ---
    function renderCartItems() {
        cartItemsContainer.innerHTML = ''; // Очищаем
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-message">Ваша корзина пуста.</p>';
            updateCartState();
            return;
        }

        cart.forEach(item => {
            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            cartItemEl.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.price.toLocaleString('ru-RU')} руб. x ${item.quantity} = ${(item.price * item.quantity).toLocaleString('ru-RU')} руб.</p>
                </div>
                <div class="cart-item-actions">
                    <button class="quantity-btn decrease-qty" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn increase-qty" data-id="${item.id}">+</button>
                    <button class="remove-item-btn" data-id="${item.id}">×</button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItemEl);
        });
        updateCartState();
    }

    // --- Управление количеством и удаление из корзины (в модальном окне) ---
    cartItemsContainer.addEventListener('click', (event) => {
        const target = event.target;
        const productId = target.dataset.id;

        if (!productId) return;

        const cartItemIndex = cart.findIndex(item => item.id === productId);
        if (cartItemIndex === -1) return;

        if (target.classList.contains('decrease-qty')) {
            cart[cartItemIndex].quantity--;
            if (cart[cartItemIndex].quantity <= 0) {
                cart.splice(cartItemIndex, 1); // Удаляем товар, если количество 0 или меньше
            }
            tg.HapticFeedback.impactOccurred('light');
        } else if (target.classList.contains('increase-qty')) {
            cart[cartItemIndex].quantity++;
            tg.HapticFeedback.impactOccurred('light');
        } else if (target.classList.contains('remove-item-btn')) {
            cart.splice(cartItemIndex, 1); // Полностью удаляем товар
            tg.HapticFeedback.notificationOccurred('warning');
        }
        
        renderCartItems(); // Перерисовываем корзину в модальном окне
        updateCartState(); // Обновляем общие счетчики
    });


document.addEventListener('DOMContentLoaded', function() {
    // ... (весь предыдущий код script.js остается) ...

    // --- Плавная прокрутка к каталогу ---
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1); // Получаем id без #
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // Учитываем высоту "прилипшего" хедера, если он есть
                const headerOffset = document.querySelector('header')?.offsetHeight || 0;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    }
    
    // --- Инициализация ---
    renderProducts();
    updateCartState();
    // tg.setHeaderColor(tg.themeParams.secondary_bg_color || '#ffffff'); 
    // Теперь хедер имеет свой фон, так что цвет от темы может быть не нужен,
    // или можно применять его к другим элементам, если это соответствует дизайну.
    // Оставим, т.к. secondary_bg_color может использоваться для фона карточек и т.д.
    // и пользователь может захотеть его изменить.
    if (tg.themeParams.secondary_bg_color) {
        tg.setHeaderColor(tg.themeParams.secondary_bg_color);
    }


    tg.onEvent('themeChanged', function() {
        // Обновление стилей при смене темы
        document.body.style.setProperty('color', tg.themeParams.text_color);
        document.body.style.setProperty('background-color', tg.themeParams.bg_color);
        
        // Если вы хотите, чтобы цвет хедера тоже менялся с темой, раскомментируйте:
        // if (tg.themeParams.secondary_bg_color) {
        //     tg.setHeaderColor(tg.themeParams.secondary_bg_color);
        // }
        // Обновите другие CSS переменные, если они используются и должны реагировать на тему
    });

    // ... (остальной код script.js) ...
});

    // --- Добавление в корзину (из каталога) ---
    productCatalog.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-cart-btn')) {
            const productId = event.target.dataset.productId;
            const product = products.find(p => p.id === productId);

            if (product) {
                const cartItem = cart.find(item => item.id === productId);
                if (cartItem) {
                    cartItem.quantity += 1;
                } else {
                    cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1, image: product.image });
                }
                updateCartState();
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    });

    // --- Открытие/Закрытие модального окна корзины ---
    function openCartModal() {
        renderCartItems();
        cartModal.style.display = 'block';
        tg.BackButton.show(); // Показываем кнопку "Назад" Telegram для закрытия модалки
    }

    function closeCartModal() {
        cartModal.style.display = 'none';
        tg.BackButton.hide();
    }

    viewCartButton.addEventListener('click', openCartModal);
    closeCartModalBtn.addEventListener('click', closeCartModal);
    
    // Закрытие модального окна по клику вне его
    window.addEventListener('click', function(event) {
        if (event.target === cartModal) {
            closeCartModal();
        }
    });

    // Обработка кнопки "Назад" Telegram
    tg.BackButton.onClick(closeCartModal);


    // --- Оформление заказа (кнопка в модальном окне корзины) ---
    checkoutButton.addEventListener('click', function() {
        if (cart.length > 0) {
            const orderData = {
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity
                })),
                totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                currency: "RUB",
                timestamp: new Date().toISOString(),
                // Важно: initDataUnsafe для простоты, для продакшена нужна валидация initData на бэкенде
                // чтобы убедиться, что данные пришли от реального пользователя Telegram
                user: tg.initDataUnsafe.user ? {
                    id: tg.initDataUnsafe.user.id,
                    firstName: tg.initDataUnsafe.user.first_name,
                    lastName: tg.initDataUnsafe.user.last_name,
                    username: tg.initDataUnsafe.user.username
                } : null
            };
            
            tg.sendData(JSON.stringify(orderData)); // Отправляем данные боту
            // sendData() автоматически закроет Mini App
            // tg.close(); // Можно не вызывать, sendData закроет
        } else {
            tg.showAlert('Ваша корзина пуста. Добавьте товары для оформления заказа.');
        }
    });
    
    // --- Кнопка Закрыть Приложение (в футере) ---
    closeAppButton.addEventListener('click', function() {
        tg.close();
    });

    // --- Инициализация ---
    renderProducts();
    updateCartState();
    tg.setHeaderColor(tg.themeParams.secondary_bg_color || '#ffffff');

    tg.onEvent('themeChanged', function() {
        // Обновление стилей при смене темы
        document.body.style.setProperty('color', tg.themeParams.text_color);
        document.body.style.setProperty('background-color', tg.themeParams.bg_color);
        tg.setHeaderColor(tg.themeParams.secondary_bg_color || '#ffffff');
    });
});