import { useEffect, useState } from "react";
import axios from "axios";
import {Link,useNavigate} from "react-router-dom";
import { Modal, Button, Form } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';

const Admin = () => {

    const [parks, setParks] = useState([]);
    const [page, setPage] = useState(0);      // 0-based page index
    const [size, setSize] = useState(15);     // 한 페이지 표시 수
    const [totalPages, setTotalPages] = useState(0);
    const [searchFilter, setSearchFilter] = useState("prk_plce_nm");
    const [searchQuery, setSearchQuery] = useState("");

    //모달 관련 상태
    const [show,setShow]=useState(false);
    const [mode,setMode]=useState("");//insert,update,delete설정
    const [form,setForm]=useState({
        prk_center_id: "",
        prk_plce_nm: "",
        prk_plce_adres: "",
        prk_plce_entrc_la: "",
        prk_plce_entrc_lo: "",
    });

    const navigate = useNavigate();
    // 서버에서 데이터 가져오기
    const fetchParks = async () => {
        try {
            const res = await axios.get("/api/parks", {
                params: { page, size, searchFilter, searchQuery }
            });
            setParks(res.data.content);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error("DB 조회 실패", err);
        }
    };

    // 페이지, 검색 조건 변경 시 자동 호출
    useEffect(() => {
        fetchParks();
    }, [page, searchFilter, searchQuery]);

    // 검색 버튼 클릭 시 페이지 초기화
    const handleSearch = () => {
        setPage(0);
    };

    //모달 열기
    const openModal=(m,park=null)=>{
        setMode(m);
        setShow(true);
        if(park){
            setForm(park);
        }else{
            setForm({
                prk_center_id: "",
                prk_plce_nm: "",
                prk_plce_adres: "",
                prk_plce_entrc_la: "",
                prk_plce_entrc_lo: "",
            })
        }
    }
    //모달 닫기
    const closeModal=()=>{
        setShow(false);
        setForm({});
    }

    const onChange=(e)=>{
        setForm({...form,[e.target.name]:e.target.value});
    }

    const handleSubmit = async () => {
        try {
            if(mode === "insert"){
                const res = await axios.post("/api/insert", form);
                // 새로 추가된 데이터를 parks 배열에 반영
                setParks(prev => [...prev, form]);
            } else if(mode === "update"){
                const res = await axios.put(`/api/update/${form.prk_center_id}`, form);
                // 수정된 데이터 반영
                setParks(prev => prev.map(p => p.prk_center_id === form.prk_center_id ? form : p));
            } else if(mode === "delete"){
                await axios.delete(`/api/delete/${form.prk_center_id}`);
                // 삭제된 데이터 제거
                setParks(prev => prev.filter(p => p.prk_center_id !== form.prk_center_id));
            }

            closeModal();
        } catch(err) {
            console.error("요청실패", err);
            alert("작업 실패");
        }
    };


    return (
        <div style={{ padding: "1rem" }}>
            <h1>관리자 페이지</h1>
            <Link to={"/"} >메인페이지</Link>
            {/* 검색 및 crud 영역 */}
            <div style={{ marginBottom: "1rem" }}>
                <select
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                >
                    <option value="prk_plce_nm">주차장 이름</option>
                    <option value="prk_plce_adres">주소</option>
                    <option value="prk_center_id">관리 ID</option>
                </select>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색어를 입력하세요"
                />
                <button onClick={handleSearch}>검색</button>
                ||
                <button onClick={() => openModal("insert")}>주차장 추가</button>
                <button onClick={()=>openModal("update")}>주차장 수정</button>
                <button onClick={()=>openModal("delete")}>주차장 삭제</button>
            </div>

            {/* 테이블 */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>주차장명</th>
                    <th>주소</th>
                    <th>위도</th>
                    <th>경도</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>10511-29300-00000-00-1</td>
                    <td>예시 데이터</td>
                    <td>경기도 고양시 </td>
                    <td>37.33</td>
                    <td>126.33</td>
                </tr>
                {parks.map((p, i) => (
                    <tr key={i}>
                        <td>{p.prk_center_id}</td>
                        <td>{p.prk_plce_nm}</td>
                        <td>{p.prk_plce_adres}</td>
                        <td>{p.prk_plce_entrc_la}</td>
                        <td>{p.prk_plce_entrc_lo}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* 페이지 네비게이션 */}
            <div style={{ marginTop: "1rem" }}>
                <button
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                >
                    이전
                </button>
                <span style={{ margin: "0 1rem" }}>
                    {page + 1} / {totalPages}
                </span>
                <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    다음
                </button>
            </div>

            {/* 모달 */}
            <Modal show={show} onHide={closeModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {mode === "insert"
                            ? "주차장 추가"
                            : mode === "update"
                                ? "주차장 수정"
                                : "주차장 삭제"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(mode === "insert" || mode === "update") && (
                        <Form>
                            <Form.Group className="mb-2">
                                <Form.Label>관리 ID</Form.Label>
                                <Form.Control
                                    name="prk_center_id"
                                    value={form.prk_center_id || ""}
                                    onChange={onChange}

                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>주차장명</Form.Label>
                                <Form.Control
                                    name="prk_plce_nm"
                                    value={form.prk_plce_nm || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>주소</Form.Label>
                                <Form.Control
                                    name="prk_plce_adres"
                                    value={form.prk_plce_adres || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>위도</Form.Label>
                                <Form.Control
                                    name="prk_plce_entrc_la"
                                    value={form.prk_plce_entrc_la || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>경도</Form.Label>
                                <Form.Control
                                    name="prk_plce_entrc_lo"
                                    value={form.prk_plce_entrc_lo || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                        </Form>
                    )}
                    {mode === "delete" && (
                        <Form.Group className="mb-2">
                            <Form.Label>관리 ID</Form.Label>
                            <Form.Control
                                name="prk_center_id"
                                value={form.prk_center_id || ""}
                                onChange={onChange}

                            />
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        닫기
                    </Button>
                    <Button
                        variant={mode === "delete" ? "danger" : "primary"}
                        onClick={handleSubmit}
                    >
                        {mode === "insert"
                            ? "추가"
                            : mode === "update"
                                ? "수정"
                                : "삭제"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Admin;
