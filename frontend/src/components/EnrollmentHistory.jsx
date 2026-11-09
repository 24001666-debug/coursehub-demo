import { useEffect, useState } from "react";
import { api } from "../api.js";
import Notice from "./Notice.jsx";

const PAGE_SIZE = 10;

// Bài 3 - Week 5: chỉ tải từng trang nhật ký demo của sinh viên đang xem.
export default function EnrollmentHistory({ studentId }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!expanded) return undefined;

    const controller = new AbortController();
    const params = new URLSearchParams({
      student_id: studentId,
      dataset: "demo",
      skip: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE + 1),
    });

    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const data = await api(`/enrollment-events?${params}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setEvents(data.slice(0, PAGE_SIZE));
        setHasNext(data.length > PAGE_SIZE);
      } catch (err) {
        if (controller.signal.aborted) return;
        setEvents([]);
        setHasNext(false);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEvents();
    return () => controller.abort();
  }, [expanded, page, studentId]);

  return (
    <section className="panel">
      <h2>4. Lịch sử đăng ký</h2>
      <button
        type="button"
        className="secondary"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Ẩn lịch sử" : "Xem lịch sử"}
      </button>

      {expanded && (
        <div className="history-content">
          {loading && <Notice>Đang tải lịch sử...</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
          {!loading && !error && events.length === 0 && (
            <p className="muted">Sinh viên chưa có sự kiện demo nào.</p>
          )}
          {!loading && !error && events.length > 0 && (
            <>
              <div className="table-scroll">
                <table aria-label={`Lịch sử đăng ký của sinh viên ${studentId}`}>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Sự kiện</th>
                      <th>Lớp học phần</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>{new Date(event.occurred_at).toLocaleString()}</td>
                        <td>
                          {event.event_type === "CREATED"
                            ? "Đăng ký"
                            : "Hủy đăng ký"}
                        </td>
                        <td>{event.class_section_id}</td>
                        <td>{event.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="pagination" aria-label="Phân trang lịch sử">
                <button
                  type="button"
                  className="secondary"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Trang trước
                </button>
                <span>Trang {page + 1}</span>
                <button
                  type="button"
                  className="secondary"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Trang sau
                </button>
              </nav>
            </>
          )}
        </div>
      )}
    </section>
  );
}
