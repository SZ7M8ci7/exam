const buffNames = ["", "ATKUP1", "ATKUP2", "ATKUP3", "ダメUP1", "ダメUP2", "ダメUP3"];

const attackMultipliers = {
  "弱単発": { power: 0.75, combo: 1.0 },
  "強単発": { power: 1.0, combo: 1.0 },
  "弱2連": { power: 0.75, combo: 0.9 },
  "強2連": { power: 1.0, combo: 0.9 },
  "弱3連": { power: 0.75, combo: 0.8 },
  "強3連": { power: 1.0, combo: 0.8 }
};

const attributeMultipliers = {
  "無": 1.1,
  "無以外": 1.0
};
let atk = 0;
function getRowSelections(row) {
  const attackSelect = row.querySelector('.attack-select');
  const attrSelect = row.querySelector('.attr-select');
  const buffSelects = row.querySelectorAll('.buff-select');
  const damageInput = row.querySelector('.damage-input');

  return {
    attack: attackSelect?.value || '',
    attribute: attrSelect?.value || '',
    buff1: buffSelects[0]?.value || '',
    buff2: buffSelects[1]?.value || '',
    buff3: buffSelects[2]?.value || '',
    damages: damageInput?.value.split(',').map(value => value.trim()).filter(value => value !== '').map(value => parseFloat(value)) || []
  };
}

function makeRow(i, initialValues = null) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${i+1}</td>
    <td>
      <select class="attack-select">
        <option></option>
        <option>弱単発</option>
        <option>強単発</option>
        <option>弱2連</option>
        <option>強2連</option>
        <option>弱3連</option>
        <option>強3連</option>
      </select>
    </td>
    <td>
      <select class="attr-select">
        <option></option>
        <option>無</option>
        <option>無以外</option>
      </select>
    </td>
    <td>
      <select class="buff-select"></select>
    </td>
    <td>
      <select class="buff-select"></select>
    </td>
    <td>
      <select class="buff-select"></select>
    </td>
    <td>
      <input type="text" class="damage-input" placeholder="例: 1000,2000,3000">
    </td>
  `;

  // バフのプルダウンを初期化
  tr.querySelectorAll('.buff-select').forEach(select => {
    buffNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.text = name;
      select.appendChild(opt);
    });
  });

  if (initialValues) {
    const attackSelect = tr.querySelector('.attack-select');
    const attrSelect = tr.querySelector('.attr-select');
    const buffSelects = tr.querySelectorAll('.buff-select');
    const damageInput = tr.querySelector('.damage-input');

    attackSelect.value = initialValues.attack;
    attrSelect.value = initialValues.attribute;
    buffSelects[0].value = initialValues.buff1;
    buffSelects[1].value = initialValues.buff2;
    buffSelects[2].value = initialValues.buff3;
    damageInput.value = initialValues.damages.join(',');
  }

  return tr;
}

function calculateDamage(atk, atkupValues, damageUpValues, attackType, attribute) {
  const attackMultiplier = attackMultipliers[attackType].power;
  const comboMultiplier = attackMultipliers[attackType].combo;
  const attributeMultiplier = attributeMultipliers[attribute];
  
  const atkupTotal = atkupValues.reduce((sum, value) => sum + (value / 100), 0);
  const damageUpTotal = damageUpValues.reduce((sum, value) => sum + (value / 100), 0);
  
  const baseDamage = (atk * (1 + atkupTotal)) * (attackMultiplier * attributeMultiplier + damageUpTotal) * comboMultiplier;
  return baseDamage;
}

function calculateError(params, rowData) {
  const { atk, atkupValues, damageUpValues } = params;
  let totalSquaredError = 0;

  for (const row of rowData) {
    if (row.damages.length === 0) continue;

    const rowAtkupValues = [0, 0, 0];
    const rowDamageUpValues = [0, 0, 0];

    if (row.buff1.startsWith('ATKUP')) {
      const index = parseInt(row.buff1.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += atkupValues[index];
      }
    } else if (row.buff1.startsWith('ダメUP')) {
      const index = parseInt(row.buff1.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += damageUpValues[index];
      }
    }

    if (row.buff2.startsWith('ATKUP')) {
      const index = parseInt(row.buff2.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += atkupValues[index];
      }
    } else if (row.buff2.startsWith('ダメUP')) {
      const index = parseInt(row.buff2.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += damageUpValues[index];
      }
    }

    if (row.buff3.startsWith('ATKUP')) {
      const index = parseInt(row.buff3.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += atkupValues[index];
      }
    } else if (row.buff3.startsWith('ダメUP')) {
      const index = parseInt(row.buff3.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += damageUpValues[index];
      }
    }

    const damage = calculateDamage(atk, rowAtkupValues, rowDamageUpValues, row.attackType, row.attribute);
    const rowError = row.damages.reduce((sum, d) => sum + Math.pow(d - damage, 2), 0);
    
    // ダメUPの誤差に重みを付ける
    const hasDamageUp = row.buff1.startsWith('ダメUP') || row.buff2.startsWith('ダメUP') || row.buff3.startsWith('ダメUP');
    const weight = hasDamageUp ? 1000.0 : 1.0;  // ダメUPの場合は1000倍の重み
    
    totalSquaredError += rowError * weight;
  }

  return totalSquaredError;
}

function calculateRowErrors(params, rowData) {
  const { atk, atkupValues, damageUpValues } = params;
  let rowErrors = [];

  for (const row of rowData) {
    if (row.damages.length === 0) continue;

    const rowAtkupValues = [0, 0, 0];
    const rowDamageUpValues = [0, 0, 0];

    if (row.buff1.startsWith('ATKUP')) {
      const index = parseInt(row.buff1.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += atkupValues[index];
      }
    } else if (row.buff1.startsWith('ダメUP')) {
      const index = parseInt(row.buff1.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += damageUpValues[index];
      }
    }

    if (row.buff2.startsWith('ATKUP')) {
      const index = parseInt(row.buff2.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += atkupValues[index];
      }
    } else if (row.buff2.startsWith('ダメUP')) {
      const index = parseInt(row.buff2.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += damageUpValues[index];
      }
    }

    if (row.buff3.startsWith('ATKUP')) {
      const index = parseInt(row.buff3.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += atkupValues[index];
      }
    } else if (row.buff3.startsWith('ダメUP')) {
      const index = parseInt(row.buff3.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += damageUpValues[index];
      }
    }

    const damage = calculateDamage(atk, rowAtkupValues, rowDamageUpValues, row.attackType, row.attribute);
    const rowError = row.damages.reduce((sum, d) => sum + Math.pow(d - damage, 2), 0);
    const rowRMSE = Math.sqrt(rowError / row.damages.length);
    
    rowErrors.push({
      rowIndex: rowErrors.length,
      attackType: row.attackType,
      attribute: row.attribute,
      buff1: row.buff1,
      buff2: row.buff2,
      buff3: row.buff3,
      rmse: rowRMSE
    });
  }

  return rowErrors;
}

function createProgressBar() {
  const progressDiv = document.createElement('div');
  progressDiv.id = 'progress-container';
  progressDiv.style.cssText = `
    margin: 10px 0;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 5px;
    display: none;
  `;
  
  const progressBar = document.createElement('div');
  progressBar.id = 'progress-bar';
  progressBar.style.cssText = `
    width: 0%;
    height: 20px;
    background: #4CAF50;
    border-radius: 3px;
    transition: width 0.3s ease;
  `;
  
  const progressText = document.createElement('div');
  progressText.id = 'progress-text';
  progressText.style.cssText = `
    margin-top: 5px;
    text-align: center;
    font-size: 14px;
  `;
  
  progressDiv.appendChild(progressBar);
  progressDiv.appendChild(progressText);
  return progressDiv;
}

function updateProgress(percent, message) {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  if (progressBar && progressText) {
    progressBar.style.width = `${percent}%`;
    progressText.textContent = message;
  }
}

function optimizeParameters(rows, initialParams) {
  const rowData = Array.from(rows).map(row => {
    const selections = getRowSelections(row);
    return {
      attackType: selections.attack,
      attribute: selections.attribute,
      buff1: selections.buff1,
      buff2: selections.buff2,
      buff3: selections.buff3,
      damages: selections.damages.map(d => parseFloat(d)).filter(d => !isNaN(d))
    };
  }).filter(row => row.damages.length > 0 && row.attackType && row.attribute);

  if (rowData.length === 0) {
    return {
      atk: 1000,
      atkupValues: [0, 0, 0],
      damageUpValues: [0, 0, 0],
      error: Infinity
    };
  }

  // 初期値の設定
  let currentParams = initialParams ? {
    atk: parseFloat(initialParams.atk),
    atkupValues: initialParams.atkupValues.map(v => parseFloat(v)),
    damageUpValues: initialParams.damageUpValues.map(v => parseFloat(v))
  } : {
    atk: 1000,
    atkupValues: [0, 0, 0],
    damageUpValues: [0, 0, 0]
  };

  let bestParams = { ...currentParams };
  let currentError = calculateError(currentParams, rowData);
  let bestError = currentError;
  let noImprovementCount = 0;

  // 焼きなまし法のパラメータ
  const initialTemp = 10000.0;
  const finalTemp = 0.001;
  const coolingRate = 0.999999;
  const maxIterations = 10000000;
  let temperature = initialTemp;


  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // 新しい解を生成（温度に応じて探索範囲を調整）
    const newParams = {
      atk: currentParams.atk + (Math.random() - 0.5) * 50 * temperature,
      atkupValues: currentParams.atkupValues.map(v => v + (Math.random() - 0.5) * 2 * temperature),
      damageUpValues: currentParams.damageUpValues.map(v => v + (Math.random() - 0.5) * 1 * temperature)
    };

    // 制約条件の適用
    newParams.atk = Math.max(500, Math.min(10000, newParams.atk));
    for (let i = 0; i < 3; i++) {
      newParams.atkupValues[i] = Math.max(0, Math.min(50, newParams.atkupValues[i]));
      newParams.damageUpValues[i] = Math.max(0, Math.min(30, newParams.damageUpValues[i]));
    }

    const newError = calculateError(newParams, rowData);
    const deltaError = newError - currentError;

    // メトロポリス基準
    if (deltaError < 0 || Math.random() < Math.exp(-deltaError / temperature)) {
      currentParams = newParams;
      currentError = newError;

      if (currentError < bestError) {
        bestParams = { ...currentParams };
        bestError = currentError;
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
      }
    }

    // 温度の更新
    temperature *= coolingRate;

    // 終了条件
    if (temperature < finalTemp) {
      break;
    }
  }

  return {
    atk: Math.round(bestParams.atk),
    atkupValues: bestParams.atkupValues.map(v => Number(v.toFixed(1))),
    damageUpValues: bestParams.damageUpValues.map(v => Number(v.toFixed(1))),
    error: bestError
  };
}

function updateResults() {
  // ダメージテーブルの行を取得（セレクタを修正）
  const rows = document.querySelectorAll('table:last-of-type tbody tr');

  // 入力欄の値を取得
  const atkInput = document.getElementById('atk');
  const atkup1Input = document.getElementById('atkup1');
  const atkup2Input = document.getElementById('atkup2');
  const atkup3Input = document.getElementById('atkup3');
  const dameup1Input = document.getElementById('dameup1');
  const dameup2Input = document.getElementById('dameup2');
  const dameup3Input = document.getElementById('dameup3');

  // 入力値があればそれを使う
  const initialParams = {
    atk: atkInput && atkInput.value ? parseInt(atkInput.value, 10) : 1000,
    atkupValues: [
      atkup1Input && atkup1Input.value ? parseFloat(atkup1Input.value) : 0,
      atkup2Input && atkup2Input.value ? parseFloat(atkup2Input.value) : 0,
      atkup3Input && atkup3Input.value ? parseFloat(atkup3Input.value) : 0
    ],
    damageUpValues: [
      dameup1Input && dameup1Input.value ? parseFloat(dameup1Input.value) : 0,
      dameup2Input && dameup2Input.value ? parseFloat(dameup2Input.value) : 0,
      dameup3Input && dameup3Input.value ? parseFloat(dameup3Input.value) : 0
    ]
  };

  const result = optimizeParameters(rows, initialParams);
  const rowData = Array.from(rows).map(row => {
    const selections = getRowSelections(row);
    return {
      attackType: selections.attack,
      attribute: selections.attribute,
      buff1: selections.buff1,
      buff2: selections.buff2,
      buff3: selections.buff3,
      damages: selections.damages.map(d => parseFloat(d)).filter(d => !isNaN(d))
    };
  }).filter(row => row.damages.length > 0 && row.attackType && row.attribute);

  const rowErrors = calculateRowErrors(result, rowData);
  const averageRMSE = rowErrors.reduce((sum, error) => sum + error.rmse, 0) / rowErrors.length;

  // 結果を表示
  const resultDiv = document.getElementById('result') || document.createElement('div');
  resultDiv.id = 'result';
  
  let resultHTML = `
    <h3>最適化結果</h3>
    <p>平均二乗平均平方根誤差: ${averageRMSE.toFixed(2)}</p>
    <h4>各行の二乗平均平方根誤差:</h4>
    <ul>
  `;

  rowErrors.forEach(error => {
    resultHTML += `
      <li>
        行${error.rowIndex + 1} (${error.attackType}, ${error.attribute}, ${error.buff1}${error.buff2 ? ', ' + error.buff2 : ''}${error.buff3 ? ', ' + error.buff3 : ''}): 
        ${error.rmse.toFixed(2)}
      </li>
    `;
  });

  resultHTML += '</ul>';
  
  // 与ダメ推定の表示を追加
  resultHTML += `
    <h4>与ダメ推定:</h4>
    <table class="damage-estimation">
      <thead>
        <tr>
          <th>攻撃</th>
          <th>属性</th>
          <th>バフ1</th>
          <th>バフ2</th>
          <th>バフ3</th>
          <th>単発ダメージ</th>
          <th>合計ダメージ</th>
        </tr>
      </thead>
      <tbody>
  `;

  // 入力されたバフの組み合わせパターンを取得
  const uniquePatterns = new Set();
  rowData.forEach(row => {
    if (row.attackType && row.attribute) {
      uniquePatterns.add(JSON.stringify({
        attackType: row.attackType,
        attribute: row.attribute,
        buff1: row.buff1,
        buff2: row.buff2,
        buff3: row.buff3
      }));
    }
  });

  // 全ての行からバフの組み合わせパターンを取得（damagesの有無に関わらず）
  const allRows = Array.from(document.querySelectorAll('table:last-of-type tbody tr')).map(row => {
    const selections = getRowSelections(row);
    return {
      attackType: selections.attack,
      attribute: selections.attribute,
      buff1: selections.buff1,
      buff2: selections.buff2,
      buff3: selections.buff3
    };
  }).filter(row => row.attackType && row.attribute);

  // 全ての行のバフの組み合わせパターンを追加
  allRows.forEach(row => {
    uniquePatterns.add(JSON.stringify({
      attackType: row.attackType,
      attribute: row.attribute,
      buff1: row.buff1,
      buff2: row.buff2,
      buff3: row.buff3
    }));
  });

  // 各パターンでの与ダメを計算
  Array.from(uniquePatterns).map(pattern => JSON.parse(pattern)).forEach(pattern => {
    const rowAtkupValues = [0, 0, 0];
    const rowDamageUpValues = [0, 0, 0];

    if (pattern.buff1.startsWith('ATKUP')) {
      const index = parseInt(pattern.buff1.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += result.atkupValues[index];
      }
    } else if (pattern.buff1.startsWith('ダメUP')) {
      const index = parseInt(pattern.buff1.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += result.damageUpValues[index];
      }
    }

    if (pattern.buff2.startsWith('ATKUP')) {
      const index = parseInt(pattern.buff2.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += result.atkupValues[index];
      }
    } else if (pattern.buff2.startsWith('ダメUP')) {
      const index = parseInt(pattern.buff2.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += result.damageUpValues[index];
      }
    }

    if (pattern.buff3.startsWith('ATKUP')) {
      const index = parseInt(pattern.buff3.replace('ATKUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowAtkupValues[index] += result.atkupValues[index];
      }
    } else if (pattern.buff3.startsWith('ダメUP')) {
      const index = parseInt(pattern.buff3.replace('ダメUP', '')) - 1;
      if (index >= 0 && index < 3) {
        rowDamageUpValues[index] += result.damageUpValues[index];
      }
    }

    const singleDamage = calculateDamage(
      result.atk,
      rowAtkupValues,
      rowDamageUpValues,
      pattern.attackType,
      pattern.attribute
    );

    // 連続攻撃の回数を取得
    const hitCount = pattern.attackType.includes('2連') ? 2 : 
                    pattern.attackType.includes('3連') ? 3 : 1;
    const totalDamage = Math.round(singleDamage * hitCount);

    resultHTML += `
      <tr>
        <td>${pattern.attackType}</td>
        <td>${pattern.attribute}</td>
        <td>${pattern.buff1}</td>
        <td>${pattern.buff2}</td>
        <td>${pattern.buff3}</td>
        <td>${Math.round(singleDamage)}</td>
        <td>${totalDamage}</td>
      </tr>
    `;
  });

  resultHTML += `
      </tbody>
    </table>
  `;

  resultDiv.innerHTML = resultHTML;
  
  if (!document.getElementById('result')) {
    document.querySelector('h2:last-of-type').after(resultDiv);
  }

  // バフ設定テーブルの値を更新
  const updateBuffValue = (elementId, value) => {
    const element = document.getElementById(elementId);
    if (element) {
      const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(50, value)) : 0;
      element.value = safeValue.toFixed(1);
    }
  };

  // ATK値の更新
  const atkElement = document.getElementById('atk');
  if (atkElement) {
    atkElement.value = result.atk.toFixed(1);
  }

  // ATKUPバフ値の更新
  updateBuffValue('atkup1', result.atkupValues[0]);
  updateBuffValue('atkup2', result.atkupValues[1]);
  updateBuffValue('atkup3', result.atkupValues[2]);

  // ダメUPバフ値の更新
  updateBuffValue('dameup1', result.damageUpValues[0]);
  updateBuffValue('dameup2', result.damageUpValues[1]);
  updateBuffValue('dameup3', result.damageUpValues[2]);
}

window.addEventListener('DOMContentLoaded', () => {
  const damageTableBody = document.querySelector('h2:last-of-type + table tbody');
  
  // 空の行を追加
  for (let i = 0; i < 10; i++) {
    const row = makeRow(i);
    damageTableBody.appendChild(row);
  }

  // 算出開始ボタンのイベントリスナーを追加
  const calculateButton = document.getElementById('calculateButton');
  calculateButton.addEventListener('click', function() {
    // ボタンを無効化して処理中であることを示す
    calculateButton.disabled = true;
    calculateButton.textContent = '計算中...';

    // 非同期で最適化処理を実行
    setTimeout(() => {
      updateResults();
      // 処理完了後、ボタンを再度有効化
      calculateButton.disabled = false;
      calculateButton.textContent = '算出開始';
    }, 0);
  });
}); 