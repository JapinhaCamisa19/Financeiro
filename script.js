// Elementos
const descricao = document.getElementById('descricao');
const valor = document.getElementById('valor');
const tipo = document.getElementById('tipo');
const data = document.getElementById('data');
const adicionar = document.getElementById('adicionar');
const registros = document.getElementById('registros');
const totalEntrada = document.getElementById('total-entrada');
const totalSaida = document.getElementById('total-saida');
const saldo = document.getElementById('saldo');
const totalRegistros = document.getElementById('total-registros');
const exportar = document.getElementById('exportar');
const pesquisar = document.getElementById('pesquisar');
const toggleModo = document.getElementById('toggleModo');
const dataInicio = document.getElementById('dataInicio');
const dataFim = document.getElementById('dataFim');
const filtrarPeriodo = document.getElementById('filtrarPeriodo');
const limparFiltro = document.getElementById('limparFiltro');

let lista = JSON.parse(localStorage.getItem('lista')) || [];
let darkMode = localStorage.getItem('darkMode') === 'true';

// Dark Mode persistente
if(darkMode){ document.body.classList.add('dark'); toggleModo.textContent='☀️'; }

// Flatpickr
flatpickr("#data",{ dateFormat:"d/m/Y", defaultDate:"today" });

// Charts
const ctxBarra = document.getElementById('graficoBarra').getContext('2d');
const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
const gradEntrada = ctxBarra.createLinearGradient(0,0,0,400);
gradEntrada.addColorStop(0,'#28a745'); gradEntrada.addColorStop(1,'#45c16c');
const gradSaida = ctxBarra.createLinearGradient(0,0,0,400);
gradSaida.addColorStop(0,'#dc3545'); gradSaida.addColorStop(1,'#e74c3c');

let chartBarra = new Chart(ctxBarra,{
    type:'bar',
    data:{ labels:[], datasets:[ { label:'Entradas', data:[], backgroundColor:gradEntrada }, { label:'Saídas', data:[], backgroundColor:gradSaida } ] },
    options:{ responsive:true, animation:{ duration:1000 }, plugins:{ legend:{ position:'top' } }, scales:{y:{beginAtZero:true}} }
});

let chartPizza = new Chart(ctxPizza,{
    type:'doughnut',
    data:{ labels:['Saldo Positivo','Saldo Negativo'], datasets:[{ data:[0,0], backgroundColor:['#28a745','#dc3545'], hoverOffset:10 }] },
    options:{ responsive:true, animation:{ animateScale:true, duration:1000 }, plugins:{ tooltip:{ callbacks:{ label: ctx=>ctx.label+': R$ '+ctx.raw.toFixed(2) } } } }
});

// Funções
function salvarLocal(){ localStorage.setItem('lista',JSON.stringify(lista)); }
function salvarDarkMode(){ localStorage.setItem('darkMode',document.body.classList.contains('dark')); }

function atualizarResumo(filtrado){
    let entrada=0,saida=0;
    filtrado.forEach(i=> i.tipo==='entrada'? entrada+=i.valor : saida+=i.valor);
    totalEntrada.textContent = entrada.toFixed(2);
    totalSaida.textContent = saida.toFixed(2);
    totalRegistros.textContent = filtrado.length;
    let s = entrada-saida;
    saldo.textContent = s.toFixed(2);
    saldo.style.color = s>=0? '#28a745':'#dc3545';
}

function atualizarGrafico(filtrado){
    chartBarra.data.labels = filtrado.map(i=>i.descricao);
    chartBarra.data.datasets[0].data = filtrado.map(i=>i.tipo==='entrada'? i.valor:0);
    chartBarra.data.datasets[1].data = filtrado.map(i=>i.tipo==='saida'? i.valor:0);
    chartBarra.update();
    let saldoAtual = filtrado.reduce((acc,i)=>i.tipo==='entrada'?acc+i.valor:acc-i.valor,0);
    chartPizza.data.datasets[0].data = saldoAtual>=0?[saldoAtual,0]:[0,Math.abs(saldoAtual)];
    chartPizza.update();
}

function filtrarLista(){
    let filtrado = lista.filter(i=> i.descricao.toLowerCase().includes(pesquisar.value.toLowerCase()));
    if(dataInicio.value){ filtrado = filtrado.filter(i=> {
        const d = i.data.split('/'); const dt = new Date(`${d[2]}-${d[1]}-${d[0]}`);
        return dt>=new Date(dataInicio.value);
    });}
    if(dataFim.value){ filtrado = filtrado.filter(i=> {
        const d = i.data.split('/'); const dt = new Date(`${d[2]}-${d[1]}-${d[0]}`);
        return dt<=new Date(dataFim.value);
    });}
    registros.innerHTML='';
    filtrado.forEach((item,index)=>{
        const li=document.createElement('li');
        li.className=item.tipo;
        li.innerHTML=`<span contenteditable="true">${item.descricao} - R$ ${item.valor.toFixed(2)} (${item.tipo}) - ${item.data}</span><button onclick="remover(${index})">❌</button>`;
        li.querySelector('span').addEventListener('blur',()=>{
            const partes = li.querySelector('span').textContent.split(' - ');
            item.descricao = partes[0] || item.descricao;
            item.valor = parseFloat(partes[1].replace('R$ ','').replace(' (entrada)','').replace(' (saida)','')) || item.valor;
            item.tipo = partes[2].includes('entrada')?'entrada':'saida';
            salvarLocal();
            atualizarResumo(filtrado);
            atualizarGrafico(filtrado);
        });
        registros.appendChild(li);
    });
    atualizarResumo(filtrado);
    atualizarGrafico(filtrado);
    salvarLocal();
}

function remover(index){ lista.splice(index,1); filtrarLista(); }

// Eventos
adicionar.addEventListener('click',()=>{
    const desc = descricao.value.trim();
    const val = parseFloat(valor.value);
    const dt = data.value;
    if(desc && !isNaN(val) && val>0 && dt){
        lista.push({descricao: desc, valor: val, tipo: tipo.value, data: dt});
        descricao.value=''; valor.value=''; data.value='';
        filtrarLista();
    } else alert('Preencha todos os campos corretamente.');
});

pesquisar.addEventListener('input', filtrarLista);
filtrarPeriodo.addEventListener('click', filtrarLista);
limparFiltro.addEventListener('click',()=>{
    dataInicio.value=''; dataFim.value=''; filtrarLista();
});

toggleModo.addEventListener('click', ()=>{
    document.body.classList.toggle('dark');
    toggleModo.textContent = document.body.classList.contains('dark') ? '☀️':'🌙';
    salvarDarkMode();
});

// Export PDF simples (sem gráfico)
exportar.addEventListener('click',()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text('Dashboard ADM Avançado',14,20);
    doc.setFontSize(12); let y=30;
    lista.forEach((i,index)=>{ doc.text(`${index+1}. ${i.descricao} - R$ ${i.valor.toFixed(2)} (${i.tipo}) - ${i.data}`,14,y); y+=8; });
    doc.save('dashboard_adm_avancado.pdf');
});

// Inicializa
filtrarLista();
