import './node_modules/materialize-css/dist/css/materialize.min.css';
import './node_modules/materialize-css/dist/js/materialize.min.js';
import './style.css'


const api = {
  config: {
    api_key: '5874acfd11651a28c55771624f7021f4',
    base_url: "http://api.themoviedb.org/3/",
    images_uri: "http://image.tmdb.org/t/p/",
    language: "ru"
  },
  handleOptions: function (options = {}) {
    let query = "?api_key=" + this.config.api_key + "&language=" + this.config.language;
    if (Object.keys(options).length > 0) {
      for (let option in options) {
        if (options.hasOwnProperty(option) && option !== "id") {
          query = query + "&" + option + "=" + options[option];
        }
      }
    }
    return query;
  },
  getPopular: function (options) {
    return fetch(api.request('movie/popular', options)).then(res => res.json());
  },
  request: function (url, options) {
    return `${api.config.base_url}${url}${this.handleOptions(options)}`;
  },
  discover: {
    getMovies: function (options) {
      return fetch(api.request('discover/movie', options)).then(res => res.json());
    }
  },
  search(text) {
    return fetch(api.request('search/movie', { query: text })).then(res => res.json());
  },
  getImage(fileUrl, size = 'w500') {
    return api.config.images_uri + size + fileUrl;
  },
  getExternalId(filmId) {
    return fetch(api.request('movie/' + filmId + '/external_ids')).then(res => res.json());
  },
  findById(id) {
    return fetch(api.request('find/' + id, { external_source: 'imdb_id' })).then(res => res.json());
  },
  openFilmDetails(id) {
    return window.open(`https://www.themoviedb.org/movie/${id}`, '_blank');
  }
}


document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('filmSearchInput').addEventListener('keyup', e => {
    delay(() => {
      e.target.value.length >= 4 ? search(e.target.value) : false;
    }, 500)
  });

  M.Modal.init(document.getElementById("searchModal"));
  document.querySelector('li.waves-effect[page=prev]').addEventListener('click', prevPage);
  document.querySelector('li.waves-effect[page=next]').addEventListener('click', nextPage);

});

const delay = (function () {
  let timer = 0;
  return function (cb, ms) {
    clearTimeout(timer);
    timer = setTimeout(cb, ms);
  };
})();


function search(text) {
  api.search(text).then(response => {
    const { results: films } = response;
    console.log(films);
  });
}


api.getPopular().then(response => {
  const start = performance.now();
  console.group('generating cards');
  const { results: films } = response;
  let filmList = document.createDocumentFragment();
  films.forEach(element => {
    filmList.appendChild(generateCard(element));
  });
  document.getElementById("films").appendChild(filmList);
  const end = performance.now();
  console.log(`getPopular ${end - start} ms`);
  console.groupEnd('generating cards');
});


function generateCard(film) {
  const start = performance.now();
  const frag = document.createDocumentFragment();
  const card = document.createElement('div');
  card.classList.add('card');
  card.classList.add('z-depth-4');

  //second block
  const cardImage = document.createElement('div');
  cardImage.className = 'card-image';
  const img = document.createElement('img');
  img.src = api.getImage(film.backdrop_path ? film.backdrop_path : film.poster_path);
  const imgText = document.createElement('span');
  imgText.className = 'card-title';
  // imgText.textContent = film.title;
  cardImage.appendChild(img);
  cardImage.appendChild(imgText);

  //third block
  const cardContent = document.createElement('div');
  cardContent.className = 'card-content';
  const cardContentText = document.createElement('p');
  // cardContentText.textContent = film.overview;
  cardContentText.textContent = film.title;
  cardContent.appendChild(cardContentText);


  card.appendChild(cardImage);
  card.appendChild(cardContent);

  const cardContainer = document.createElement('div');
  cardContainer.classList.add('col');
  cardContainer.classList.add('m3');

  cardContainer.appendChild(card);

  card.addEventListener('click', openFilm.bind(film.id));



  frag.appendChild(cardContainer);
  const end = performance.now();
  console.log(`generateCard ${end - start} ms`);
  return frag;
}

function getFilmDataByFilmId(filmId) {
  const start = performance.now();
  return api.getExternalId(filmId).then(res => {
    const { imdb_id } = res;
    return api.findById(imdb_id).then(res => {
      const { movie_results: result } = res;
      const end = performance.now();
      console.log(`getFilmDataByFilmId ${end - start} ms`);
      return result[0];
    })
  })
}

function generateModal(filmId) {
  return getFilmDataByFilmId(filmId).then(film => {
    const start = performance.now();
    const container = document.createDocumentFragment();
    const modal = document.createElement('div'); modal.id = film.id; modal.classList.add('modal', 'modal-sm');
    const modalContent = document.createElement('div'); modalContent.classList.add('modal-content');
    const modalHeader = document.createElement('h4'); modalHeader.textContent = `${film.title} (${film.release_date.substring(0, 4)})`;
    const modalHeaderInfo = document.createElement('h5'); modalHeaderInfo.textContent = 'Обзор';
    const modalText = document.createElement('p'); modalText.innerHTML = film.overview;
    const modalTextRating = document.createElement('p'); modalTextRating.innerHTML = `Рейтинг пользователя ${film.vote_average * 10}%`;
    const modalFooter = document.createElement('div'); modalFooter.classList.add('modal-footer');
    const modalButton = document.createElement('a'); modalButton.classList.add('waves-effect', 'waves-green', 'btn-large'); modalButton.innerHTML = 'View';
    const filmPoster = document.createElement('img'); filmPoster.src = api.getImage(film.poster_path);
    modalButton.addEventListener('click', viewFilmById.bind(filmId));
    modalFooter.appendChild(modalButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(filmPoster);
    modalContent.appendChild(modalHeaderInfo);
    modalContent.appendChild(modalText);
    modalContent.appendChild(modalTextRating);
    modal.appendChild(modalContent);
    modal.appendChild(modalFooter);
    container.appendChild(modal);
    const end = performance.now();
    console.log(`generateModal ${end - start} ms`);
    return { container, film };
  });

}

function openFilm() {
  const start = performance.now();
  generateModal(this).then(data => {
    const { container: modal, film } = data;
    const modalContainer = document.getElementById('filmModalContainer');
    if (!document.getElementById(film.id)) {
      modalContainer.appendChild(modal);
    }
    const myModal = M.Modal.init(document.getElementById(film.id));
    myModal.open();
  });
  const end = performance.now();
  console.log(`openFilm ${end - start} ms`);
}

function viewFilmById() {
  api.openFilmDetails(this);
}

function prevPage() {
  console.log("prev page");
}

function nextPage() {
  console.log("next page");
}
