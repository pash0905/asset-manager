import React, { useState } from "react";
import "./App.css";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

function App() {
  // 화면 상태: main(메인), expense(생활비), invest(제테크), flow(자산흐름)
  const [screen, setScreen] = useState("main");
  // 생활비 관리에서 누구(성환/지혜) 선택
  const [person, setPerson] = useState(null);
  // 마지막으로 작업한 월/년/사람 기억
  const [lastExpenseState, setLastExpenseState] = useState({
    person: null,
    year: null,
    month: null,
  });
  // 고유 rowId 생성 함수
  const [globalRowId, setGlobalRowId] = useState(1000);
  const getNextRowId = () => {
    setGlobalRowId((id) => id + 1);
    return globalRowId;
  };

  // 메인 화면
  if (screen === "main") {
    return (
      <div className="container">
        <h1>자산 관리</h1>
        <button className="main-btn" onClick={() => setScreen("expense")}>
          생활비 관리
        </button>
        <button className="main-btn" onClick={() => setScreen("invest")}>
          제테크 관리
        </button>
        <button className="main-btn" onClick={() => setScreen("flow")}>
          자산 흐름
        </button>
      </div>
    );
  }

  // 생활비 관리 화면
  if (screen === "expense") {
    // 상세 페이지로 이동
    if (person) {
      return (
        <ExpenseDetail
          person={person}
          goBack={() => {
            setLastExpenseState({
              person,
              year: lastExpenseState.year,
              month: lastExpenseState.month,
            });
            setPerson(null);
          }}
          lastExpenseState={lastExpenseState}
          setLastExpenseState={setLastExpenseState}
          getNextRowId={getNextRowId}
        />
      );
    }
    return (
      <div className="container">
        <button
          className="back-btn"
          onClick={() => {
            setScreen("main");
            setPerson(null);
          }}
        >
          뒤로가기
        </button>
        <h2>생활비 관리</h2>
        <button
          className="person-btn"
          onClick={() => {
            if (
              lastExpenseState.person === "성환" &&
              lastExpenseState.year &&
              lastExpenseState.month
            ) {
              setPerson("성환");
            } else {
              setPerson("성환");
            }
          }}
        >
          성환
        </button>
        <button
          className="person-btn"
          onClick={() => {
            if (
              lastExpenseState.person === "지혜" &&
              lastExpenseState.year &&
              lastExpenseState.month
            ) {
              setPerson("지혜");
            } else {
              setPerson("지혜");
            }
          }}
        >
          지혜
        </button>
      </div>
    );
  }

  // 제테크 관리, 자산 흐름(아직 미구현)
  return (
    <div className="container">
      <button className="back-btn" onClick={() => setScreen("main")}>
        뒤로가기
      </button>
      <h2>아직 준비 중입니다.</h2>
    </div>
  );
}

function ExpenseInput({ person }) {
  const [date, setDate] = React.useState("");
  const [item, setItem] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Firestore 연동
  const { collection, addDoc, Timestamp } = require("firebase/firestore");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "expenses"), {
        person,
        date,
        item,
        amount: Number(amount),
        createdAt: Timestamp.now(),
      });
      setSuccess(true);
      setDate("");
      setItem("");
      setAmount("");
    } catch (err) {
      alert("저장 중 오류가 발생했습니다: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 30, textAlign: "left" }}>
      <h3>{person}의 생활비 입력</h3>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label>
          날짜:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label>
          항목:
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="예: 식비, 교통비"
            required
          />
        </label>
        <label>
          금액:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 10000"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#1976d2",
            color: "#fff",
            padding: 10,
            border: "none",
            borderRadius: 8,
            fontSize: 16,
          }}
        >
          {loading ? "저장 중..." : "저장하기"}
        </button>
        {success && (
          <div style={{ color: "green", marginTop: 8 }}>저장 완료!</div>
        )}
      </form>
    </div>
  );
}

function ExpenseDetail({
  person,
  goBack,
  lastExpenseState,
  setLastExpenseState,
  getNextRowId,
}) {
  // 월 상태 관리
  const today = new Date();
  const [year, setYear] = React.useState(
    lastExpenseState &&
      lastExpenseState.person === person &&
      lastExpenseState.year
      ? lastExpenseState.year
      : today.getFullYear()
  );
  const [month, setMonth] = React.useState(
    lastExpenseState &&
      lastExpenseState.person === person &&
      lastExpenseState.month
      ? lastExpenseState.month
      : today.getMonth() + 1
  );
  const [showMonthPicker, setShowMonthPicker] = React.useState(false);

  // Firestore 연동 상태
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // 월별/사람별 데이터 저장 구조 (로컬 캐시)
  const [allData, setAllData] = React.useState({}); // { '성환-2025-7': { rows: [...] } }
  const key = `${person}-${year}-${month}`;
  const firestoreId = `${person}_${year}_${month}`;

  // 디폴트 행 구조
  const defaultRows = [
    { type: "수입", label: "수입", value: "", id: 1 },
    { type: "고정", label: "제목입력", value: "", id: 2 },
    { type: "변동", label: "제목입력", value: "", id: 3 },
  ];

  // Firestore에서 데이터 불러오기 (캐시 우선, 네트워크 후 동기화)
  React.useEffect(() => {
    let ignore = false;
    // 캐시 우선 보여주기
    if (!allData[key]) {
      // 이전 월 구조 복사
      let prevRows;
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
      }
      const prevKey = `${person}-${prevYear}-${prevMonth}`;
      if (allData[prevKey]) {
        prevRows = allData[prevKey].rows;
      }
      if (prevRows) {
        setAllData((prev) => ({
          ...prev,
          [key]: {
            rows: prevRows.map((r) => ({
              ...r,
              value: "",
              id: getNextRowId(),
            })),
          },
        }));
      } else {
        setAllData((prev) => ({
          ...prev,
          [key]: {
            rows: defaultRows.map((r) => ({ ...r, id: getNextRowId() })),
          },
        }));
      }
    }
    // Firestore에서 동기화
    async function fetchRows() {
      setLoading(true);
      setError("");
      try {
        const docRef = doc(db, "expenses", firestoreId);
        const snap = await getDoc(docRef);
        if (!ignore) {
          if (snap.exists()) {
            const data = snap.data();
            setAllData((prev) => ({
              ...prev,
              [key]: { rows: data.rows || defaultRows },
            }));
          }
        }
      } catch (e) {
        if (!ignore) setError("데이터 불러오기 오류: " + e.message);
      }
      setLoading(false);
    }
    fetchRows();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line
  }, [key]);

  // 현재 rows
  const rows = allData[key]?.rows || defaultRows;

  // Firestore에 저장
  const saveRows = async (newRows) => {
    setSaving(true);
    setError("");
    try {
      await setDoc(doc(db, "expenses", firestoreId), { rows: newRows });
    } catch (e) {
      setError("저장 오류: " + e.message);
    }
    setSaving(false);
  };

  // rows 변경 시 Firestore/로컬에 저장
  const updateRows = (newRows) => {
    setAllData((prev) => ({ ...prev, [key]: { rows: newRows } }));
    setLastExpenseState({ person, year, month }); // 항상 최신 월/년/사람 기억
    saveRows(newRows);
  };

  // 입력값 변경
  const handleChange = (id, value) => {
    if (isNaN(Number(value.replace(/,/g, "")))) return;
    const newRows = rows.map((r) => (r.id === id ? { ...r, value } : r));
    updateRows(newRows);
  };
  // 행 추가
  const handleAddRow = (type, idx) => {
    const newRow = { type, label: "제목입력", value: "", id: getNextRowId() };
    const newRows = [...rows];
    newRows.splice(idx + 1, 0, newRow);
    updateRows(newRows);
  };
  // 행 삭제
  const handleDeleteRow = (id, type) => {
    const typeRows = rows.filter((r) => r.type === type);
    if (typeRows.length <= 1) return;
    const newRows = rows.filter((r) => r.id !== id);
    updateRows(newRows);
  };
  // 합계/잔여금/저축률 계산
  const getSum = (type) =>
    rows
      .filter((r) => r.type === type)
      .reduce(
        (sum, r) => sum + Number((r.value || "0").toString().replace(/,/g, "")),
        0
      );
  const incomeSum = getSum("수입");
  const fixedSum = getSum("고정");
  const varSum = getSum("변동");
  const remain = incomeSum - fixedSum - varSum;
  const saveRate = incomeSum ? Math.round((remain / incomeSum) * 100) : 0;

  // 1,000단위 포맷 함수
  const formatNumber = (v) => {
    if (v === undefined || v === null || v === "") return "";
    const num = Number(v.toString().replace(/,/g, ""));
    if (isNaN(num)) return "";
    return num.toLocaleString();
  };

  // 표 렌더링
  const renderRows = (type) => {
    return rows
      .map((row, idx) => {
        if (row.type !== type) return null;
        return (
          <tr key={row.id}>
            <td>
              <input
                type="text"
                value={row.label}
                onChange={(e) => {
                  const v = e.target.value;
                  const newRows = rows.map((r) =>
                    r.id === row.id ? { ...r, label: v } : r
                  );
                  updateRows(newRows);
                }}
                style={{ width: 80 }}
              />
            </td>
            <td>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9,]*"
                value={formatNumber(row.value)}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9]/g, "");
                  if (val) val = Number(val).toLocaleString();
                  handleChange(row.id, val);
                }}
                style={{ width: 80, textAlign: "right" }}
              />
            </td>
            <td>
              <button
                onClick={() => handleAddRow(row.type, idx)}
                style={{
                  marginRight: 4,
                  background: "#90caf9",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                +
              </button>
              <button
                onClick={() => handleDeleteRow(row.id, row.type)}
                style={{
                  background: "#ffcdd2",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                -
              </button>
            </td>
          </tr>
        );
      })
      .filter(Boolean);
  };

  // 월 이동
  const prevMonth = () => {
    setLastExpenseState({ person, year, month: month === 1 ? 12 : month - 1 });
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };
  const nextMonth = () => {
    setLastExpenseState({ person, year, month: month === 12 ? 1 : month + 1 });
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };
  // 월/년 직접 선택
  const handleMonthPick = (e) => {
    const [y, m] = e.target.value.split("-");
    setLastExpenseState({ person, year: Number(y), month: Number(m) });
    setYear(Number(y));
    setMonth(Number(m));
    setShowMonthPicker(false);
  };

  return (
    <div className="container" style={{ minWidth: 340, maxWidth: 600 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <button
          className="back-btn"
          onClick={() => {
            setLastExpenseState({ person, year, month });
            goBack();
          }}
          style={{ position: "static", marginRight: 8 }}
        >
          ◀
        </button>
        <button
          style={{
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            marginRight: 8,
          }}
          disabled
        >
          생활비 관리
        </button>
        <button
          style={{
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
          }}
          disabled
        >
          {person}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <button
          onClick={prevMonth}
          style={{
            background: "#bbdefb",
            border: "1px solid #bbb",
            borderRadius: 6,
            padding: "6px 12px",
            marginRight: 8,
          }}
        >
          ◀
        </button>
        <button
          onClick={() => setShowMonthPicker(true)}
          style={{
            background: "#fffde7",
            border: "1px solid #bbb",
            borderRadius: 6,
            padding: "6px 24px",
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          {year}년 {month}월
        </button>
        <button
          onClick={nextMonth}
          style={{
            background: "#bbdefb",
            border: "1px solid #bbb",
            borderRadius: 6,
            padding: "6px 12px",
            marginLeft: 8,
          }}
        >
          ▶
        </button>
        {showMonthPicker && (
          <input
            type="month"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={handleMonthPick}
            style={{ marginLeft: 8 }}
          />
        )}
      </div>
      {loading && (
        <div style={{ color: "#1976d2", marginBottom: 8 }}>불러오는 중...</div>
      )}
      {saving && (
        <div style={{ color: "#1976d2", marginBottom: 8 }}>저장 중...</div>
      )}
      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff",
        }}
      >
        <thead>
          <tr style={{ background: "#e3f2fd" }}>
            <th style={{ width: 120, border: "1px solid #bbb", padding: 6 }}>
              항목
            </th>
            <th style={{ width: 100, border: "1px solid #bbb", padding: 6 }}>
              금액
            </th>
            <th
              style={{ width: 40, border: "1px solid #bbb", padding: 6 }}
            ></th>
          </tr>
        </thead>
        <tbody>
          {/* 수입 */}
          {renderRows("수입")}
          <tr style={{ background: "#f0f0f0", fontWeight: "bold" }}>
            <td>소계(수입)</td>
            <td colSpan={2}>{formatNumber(incomeSum)}</td>
          </tr>
          {/* 고정지출 */}
          {renderRows("고정")}
          <tr style={{ background: "#f0f0f0", fontWeight: "bold" }}>
            <td>소계(고정)</td>
            <td colSpan={2}>{formatNumber(fixedSum)}</td>
          </tr>
          {/* 변동지출 */}
          {renderRows("변동")}
          <tr style={{ background: "#f0f0f0", fontWeight: "bold" }}>
            <td>소계(변동)</td>
            <td colSpan={2}>{formatNumber(varSum)}</td>
          </tr>
          {/* 잔여/저축률 */}
          <tr style={{ background: "#e3f2fd", fontWeight: "bold" }}>
            <td>잔여금</td>
            <td colSpan={2}>{formatNumber(remain)}</td>
          </tr>
          <tr style={{ background: "#e3f2fd", fontWeight: "bold" }}>
            <td>저축률</td>
            <td colSpan={2}>{incomeSum ? `${saveRate}%` : ""}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default App;
