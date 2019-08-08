// Variables
let todos;
const DEFAULT_IMAGE = 'img/default.svg';
const DISABLED_CSS_CLASS = 'disabled';
const ENABLED_CSS_CLASS = 'enabled';
const IMAGE_SIZE_LIMIT = 5000000; // 5MB
const FRONT_CAMERA = 'user';
const REAR_CAMERA = 'environment';
let isFrontCamera;

// Modals
const modalNewItem = $('#todo-modal');
const modalCamera = $('#camera-modal');
// Buttons
const btnSaveTodoItem = document.getElementById('save-todo-item');
const btnCamera = document.getElementById('camera-capture');
const btnRemovePicture = document.getElementById('remove-picture');
const btnClearTodos = document.getElementById('clear-todos');
const btnShowCompletedTodos = document.getElementById('show-completed-todos');
const btnShowPendingTodos = document.getElementById('show-pending-todos');
const btnOpenCameraModal = document.getElementById('open-camera-modal');
const btnRotateCamera = document.getElementById('rotate-camera');
// Todo HTML elements (id, task, image)
const todoItemTask = document.getElementById('todo-item-task');
const todoItemID = document.getElementById('todo-item-id');
const todoItemImage = document.getElementById('todo-item-image');
const fileInput = document.getElementById('file-input');
// Other elements
const todoContainer = document.getElementById('todo-container');
const videoContainer = document.getElementById('video-container');

// Initialize
function initialize() {
  // Check if getUserMedia is supported on the device
  if (!hasMediaDevicesApi()) {
    btnOpenCameraModal.hidden = true;
  }
  if (isAndroidOS()) {
    // use rear camera for android
    btnRotateCamera.hidden = false;
    isFrontCamera = false;
  } else {
    // use front camera for browser/electron
    btnRotateCamera.hidden = true;
    isFrontCamera = true;
  }
  document.addEventListener('deviceready', onDeviceReady.bind(this), false);
  initData();
  addListeners();
  renderTodoElements(todos);
}

function initData() {
  try {
    todos = JSON.parse(localStorage.getItem('todos'));
  } catch (error) {
    alert('Could not fetch data');
    alert(JSON.stringify(error));
    todos = [];
  }
  if (!todos || !Array.isArray(todos)) todos = [];
}

function onDeviceReady() {
  console.log('Device is ready');
}


// Actions

function saveTodoItem(e) {
  if (isDisabled(btnSaveTodoItem)) return;
  const newItem = {
    id: -1,
    image: DEFAULT_IMAGE,
    task: '',
    completed: false
  };
  try {
    newItem.id = parseInt(todoItemID.value, 10);
  } catch (error) {
    newItem.id = -1;
  }
  newItem.task = todoItemTask.value;
  if (todoItemImage && todoItemImage.src) newItem.image = todoItemImage.src;
  if (newItem.id >= 0) {
    // Modify
    const index = getTodoIndex(newItem.id);
    if (index >= 0) {
      todos[index] = newItem;
    } else {
      alert('Invalid Index');
    }
  } else {
    // New
    newItem.id = getLatestIndex();
    todos.push(newItem);
  }
  renderTodoElements(todos);
  modalTodoClosed();
  saveToLocalStorage(todos);
}

function completeTodo(id) {
  if (!todos || !todos.length) return;
  const index = getTodoIndex(id);
  if (index >= 0) todos[index].completed = true;
  renderTodoElements(todos);
  saveToLocalStorage(todos);
}

function removeTodo(id) {
  if (!todos || !todos.length) return;
  const index = getTodoIndex(id);
  let isCompletedTodo;
  if (index >= 0) {
    isCompletedTodo = todos[index].completed;
    todos.splice(index, 1);
  }
  renderTodoElements(todos, isCompletedTodo);
  saveToLocalStorage(todos);
}

function modifyTodo(id) {
  if (!todos || !todos.length) return;
  const index = getTodoIndex(id);
  const todo = todos[index];
  todoItemID.value = todo.id;
  todoItemTask.value = todo.task;
  if (todo && todo.image) todoItemImage.src = todo.image;
  modalNewItem.modal('show');
}

function clearTodos() {
  todos = [];
  renderTodoElements(todos);
  saveToLocalStorage(todos);
}

function showCompletedTodos(e) {
  renderTodoElements(todos, true);
}

function showPendingTodos(e) {
  renderTodoElements(todos);
}

function renderTodoElements(todos, flag = false) {
  // filter to display pending or completed todos
  filteredTodos = todos.filter(function(todo) {
    return todo.completed === flag;
  });
  if (!filteredTodos || !filteredTodos.length) {
    showEmptyTodoContainer();
    return;
  }
  let todoElements = '';
  filteredTodos
    .forEach(function(todo) {
      let buttonCompleteHtmlElement = '';
      let buttonModifyHtmlElement = '';
      if (!todo.completed) {
        buttonModifyHtmlElement = `<a onclick="modifyTodo(${todo.id})" id="btn-modify-item-${todo.id}" class="btn btn-sm btn-primary enabled edit-btn"><i class="fa fa-pen"></i> Edit</a>`;
        buttonCompleteHtmlElement = `<a onclick="completeTodo(${todo.id})" id="btn-remove-item-${todo.id}" class="btn btn-sm btn-success enabled check-task-btn"><i class="fa fa-check-circle"></i> check!</a>`;
      }
      let todoElement = `
                <div class="container card">
                <div class="header-card">
                </div>
                    <div class="row card-body">
                      <div class="col-5">
                        <div class="photo-sticker">
                        </div>
                        <img src="${todo.image}" class="card-img-top">
                      </div>
                      <div class="col card-title-col">
                        <h5 class="card-title">${todo.task}</h5>
                      </div>

                      <p>
                          ${buttonModifyHtmlElement}
                          <a onclick="removeTodo(${todo.id})" id="btn-delete-item-${todo.id}" class="btn btn-sm btn-danger enabled remove-task-btn"><i class="fa fa-times"></i> Delete</a>
                          ${buttonCompleteHtmlElement}
                      </p>
                    </div>
                </div>
            `;
      todoElements += todoElement;
    });
  if (todoElements) {
    todoContainer.innerHTML = todoElements;
  } else {
    showEmptyTodoContainer();
  }
}

// Modals

function modalTodoClosed() {
  todoItemTask.value = '';
  todoItemID.value = -1;
  removePicture();
  modalNewItem.modal('hide');
}

function modalTodoShown() {
  todoItemTask.focus();
  checkButtonDisability(btnSaveTodoItem, todoItemTask.value);
  checkButtonDisability(btnRemovePicture, !todoItemImage.src.endsWith(DEFAULT_IMAGE));
}

function openCameraModal() {
  modalCamera.modal('show');
}

function modalCameraShown() {
  turnOnCamera(isFrontCamera);
  btnCamera.focus();
}

function modalCameraClosed() {
  turnOfCamera();
}

// Camera/Image
function hasMediaDevicesApi() {
  return !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);
}

function rotateCamera(e) {
  isFrontCamera = !isFrontCamera;
  turnOfCamera();
  turnOnCamera(isFrontCamera);
}

function turnOnCamera(frontCamera) {
  const facingModeOption = frontCamera ? FRONT_CAMERA : REAR_CAMERA;
  const constraints = {
    video: {
      width: {
        exact: 250
      },
      height: {
        exact: 250
      },
      facingMode: facingModeOption
    }
  };
  // Access to the camera and turn it own
  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleSuccess)
    .catch(handleError);

  function handleSuccess(stream) {
    videoContainer.srcObject = stream;
  }

  function handleError(error) {
    alert('Could not get user media API' + JSON.stringify(error));
  }
}

function turnOfCamera() {
  if (videoContainer && videoContainer.srcObject) {
    videoContainer.srcObject.getTracks().forEach(function(track) {
      track.stop();
    });
    videoContainer.srcObject = null;
  }
}

function takePicture(e) {
  const canvas = document.createElement('canvas');
  // Saving current image
  canvas.width = videoContainer.videoWidth;
  canvas.height = videoContainer.videoHeight;
  canvas.getContext('2d').drawImage(videoContainer, 0, 0);
  // If the video source Object is set, stop all tracks
  if (videoContainer.srcObject) {
    videoContainer.srcObject.getTracks().forEach(function(track) {
      track.stop();
      try {
        // Other browsers will fall back to image/png
        todoItemImage.src = canvas.toDataURL('image/webp');
        setElementEnabled(btnRemovePicture);
      } catch (error) {
        alert('Could not get the picture.' + JSON.stringify(error));
      }
    });
  }
}

function browseImage(event) {
  const files = event.target.files;
  if (files && files[0]) {
    if (!isFileImage(files[0])) {
      alert('Please upload a valid picture');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const data = e.target.result;
      if (data.length > IMAGE_SIZE_LIMIT && !confirm('The image size is very big. Do you want to continue?')) return;
      todoItemImage.setAttribute('src', e.target.result);
      setElementEnabled(btnRemovePicture);
    }
    reader.readAsDataURL(files[0]);
  } else {
    todoItemImage.setAttribute('src', 'img/default.svg');
  }
  event.target.value = '';
}

// Utils

function isAndroidOS() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(userAgent)) return true;
  return false;
}

function isFileImage(file) {
  return file && file['type'].split('/')[0] === 'image';
}

function saveToLocalStorage(values) {
  try {
    localStorage.setItem('todos', JSON.stringify(values));
  } catch (error) {
    alert('Could not save the last modification to local storage. Maybe the data exceeds the quota limitation. Please restart the app.');
    console.error(error);
  }
}

function addListeners() {
  btnRotateCamera.addEventListener('click', rotateCamera);
  btnOpenCameraModal.addEventListener('click', openCameraModal);
  btnSaveTodoItem.addEventListener('click', saveTodoItem);
  btnClearTodos.addEventListener('click', clearTodos);
  btnCamera.addEventListener('click', takePicture)
  btnShowCompletedTodos.addEventListener('click', showCompletedTodos);
  btnShowPendingTodos.addEventListener('click', showPendingTodos);
  btnRemovePicture.addEventListener('click', removePicture);
  todoItemTask.addEventListener('input', inputChanged);
  fileInput.addEventListener('change', browseImage);
  modalNewItem.on('hidden.bs.modal', modalTodoClosed);
  modalNewItem.on('shown.bs.modal', modalTodoShown);
  modalCamera.on('hidden.bs.modal', modalCameraClosed);
  modalCamera.on('shown.bs.modal', modalCameraShown);
}

function checkButtonDisability(button, value) {
  if (!!value) {
    setElementEnabled(button);
  } else {
    setElementDisabled(button);
  }
}

function inputChanged(e) {
  checkButtonDisability(btnSaveTodoItem, this.value);
}

function getLatestIndex() {
  // For simplicity, I'm only returning the latest index. You can, for example, generate random unique string
  if (!todos || !todos.length) return 0;
  return todos.length;
}

function getTodoIndex(id) {
  const index = todos.findIndex(function(todo) {
    return todo.id === id
  });
  return index;
}

function removePicture() {
  if (isDisabled(btnRemovePicture)) return;
  todoItemImage.src = DEFAULT_IMAGE;
  setElementDisabled(btnRemovePicture);
}

function isDisabled(element) {
  if (element && element.classList.contains(DISABLED_CSS_CLASS)) return true;
  return false;
}

function setElementDisabled(element) {
  element.classList.add(DISABLED_CSS_CLASS);
  element.classList.remove(ENABLED_CSS_CLASS);
}

function setElementEnabled(element) {
  element.classList.add(ENABLED_CSS_CLASS);
  element.classList.remove(DISABLED_CSS_CLASS);
}

function showEmptyTodoContainer() {
  todoContainer.innerHTML = `<h1 class="no-tasks">You have no tasks.</h1>`;
}

$("#nav-clip").click(function() {
  const elements = document.querySelectorAll('.btn-side');
  if ($(".btn-side").hasClass("hidden")) {
    elements.forEach(function(element) {
      element.classList.remove('hidden');
        element.classList.add('animated', 'fadeInRight');
        element.addEventListener('animationend', function() {
          element.classList.remove('animated', 'fadeInRight')
        })
    });
  } else {
    elements.forEach(function(element) {
      element.classList.add('animated', 'fadeOutRight');
      element.addEventListener('animationend', function() {
        element.classList.remove('animated', 'fadeOutRight');
      })
      element.classList.add('hidden');
    })
  }
});

initialize();
