window.addEventListener('load', () => {
  initDT(); // Initialize the DatatTable and window.columnNames variables
  addDarkmodeWidget();

  const repo = getRepoFromUrl();

  if (repo) {
    document.getElementById('q').value = repo;
    fetchData();
  }
});

document.getElementById('form').addEventListener('submit', e => {
  e.preventDefault();
  fetchData();
});

function addDarkmodeWidget() {
  new Darkmode( { label: '🌓' } ).showWidget();
}

function fetchData() {
  const repo = document.getElementById('q').value.replaceAll(' ','');
  const re = /[-_\w]+\/[-_.\w]+/;

  const urlRepo = getRepoFromUrl();

  if (!urlRepo || urlRepo !== repo) {
    window.history.pushState('', '', `#${repo}`);
  }

  if (re.test(repo)) {
    fetchAndShow(repo);
  } else {
    showMsg(
      'Invalid GitHub repository! Format is &lt;username&gt;/&lt;repo&gt;',
      'danger'
    );
  }
}

function updateDT(data) {
  // Remove any alerts, if any:
  if ($('.alert')) $('.alert').remove();

  // Format dataset and redraw DataTable. Use second index for key name
  const forks = [];
  const host = 'https://eapo.github.io/active-forks/index.html#'
  for (let fork of data) {
    fork.ownerName = `<a href="${fork.owner.html_url}" title="Open in new tab: /${fork.owner}" target="_blank"><img src="${fork.owner.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'}&s=48" width="24" height="24" class="mr-2 rounded-circle" />${fork.owner ? fork.owner.login : '<strike><em>Unknown</em></strike>'}</a>`;
    fork.name = `<a href="${fork.html_url}" title="Open in new tab: /${fork.full_name}" target="_blank">${fork.name}</a>`;
    fork.forks = `${(fork.forks >= 1)?`<a href="${host}${fork.full_name}" title="Open in new tab: ${host}${fork.full_name}" target="_blank">${fork.forks}</a>`:0}`;
    fork.open_issues_count = `${(fork.open_issues_count >= 1)?`<a href="${fork.html_url}/issues" title="Open in new tab: /${fork.full_name}/issues" target="_blank">${fork.open_issues_count}</a>`:0}`;
    forks.push(fork);
  }
  const dataSet = forks.map(fork =>
    window.columnNamesMap.map(colNM => fork[colNM[1]])
  );
  window.forkTable
    .clear()
    .rows.add(dataSet)
    .draw();
}

function initDT() {
  // Create ordered Object with column name and mapped display name
  window.columnNamesMap = [
    ['Owner', 'ownerName'], // custom key
    ['Repo', 'name'], // custom key
    ['Branch', 'default_branch'],
    ['Lang', 'language'],
    ['Stars', 'stargazers_count'],
    ['Forks', 'forks'], // custom key
    ['Open Issues', 'open_issues_count'], // custom key
    ['Size', 'size'],
    ['Last Push', 'pushed_at'],
  ];

  // Sort by stars:
  const sortColName = 'Stars';
  const sortColumnIdx = window.columnNamesMap
    .map(pair => pair[0])
    .indexOf(sortColName);

  // Use first index for readable column name
  // we use moment's fromNow() if we are rendering for `pushed_at`; better solution welcome
  window.forkTable = $('#forkTable').DataTable({
    columns: window.columnNamesMap.map(colNM => {
      return {
        title: colNM[0],
        render:
          colNM[1] === 'pushed_at'
            ? (data, type, _row) => {
                if (type === 'display') {
                  return moment(data).fromNow();
                }
                return data;
              }
            : null,
      };
    }),
    order: [[sortColumnIdx, 'desc']],
    // paging: false,
    searchBuilder:{
      // all options at default
    }
  });
  let table = window.forkTable;
  new $.fn.dataTable.SearchBuilder(table, {});
  table.searchBuilder.container().prependTo(table.table().container());
}

function fetchAndShow(repo) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace(/\.git$/, '');

  fetch(
    `https://api.github.com/repos/${repo}/forks?sort=stargazers&per_page=100`
  )
    .then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then(data => {
      updateDT(data);
    })
    .catch(error => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
    });
}

function showMsg(msg, type) {
  let alert_type = 'alert-info';

  if (type === 'danger') {
    alert_type = 'alert-danger';
  }

  document.getElementById('footer').innerHTML = '';

  document.getElementById('data-body').innerHTML = `
        <div class="alert ${alert_type} alert-dismissible fade show" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            ${msg}
        </div>
    `;
}

function getRepoFromUrl() {
  const urlRepo = location.hash && location.hash.slice(1);

  return urlRepo && decodeURIComponent(urlRepo);
}
