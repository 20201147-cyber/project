// src/components/panels/MyPanel.js
import React from "react";

export default function MyPanel({
  favorites,
  parkingList,
  onSelectFavorite,
  onRemoveFavorite,
}) {
  const hasFavorites = favorites && favorites.length > 0;

  return (
    <div className="panel my-panel">
      <h3 className="my-panel-title">My 즐겨찾기</h3>
      <p className="my-panel-desc">
        즐겨찾기로 등록한 주차장을 한 번에 확인하고 바로 길안내를 시작할 수 있습니다.
      </p>

      {!hasFavorites && (
        <div className="my-empty">
          아직 즐겨찾기한 주차장이 없습니다.
          <br />
          지도나 목록에서 마음에 드는 주차장을 즐겨찾기로 등록해 보세요.
        </div>
      )}

      {hasFavorites && (
        <ul className="my-fav-list">
          {favorites.map((fav) => {
            const park = parkingList.find((p) => p.PKLT_CD === fav.parkId);
            const remain =
              park && park.remainCnt != null ? `${park.remainCnt}면` : "-";

            return (
              <li key={fav.parkId} className="my-fav-item">
                <div className="my-fav-main">
                  <div className="my-fav-name">{fav.name}</div>
                  <div className="my-fav-meta">
                    예상 잔여 / 전체 : {remain}
                  </div>
                  {park && (
                    <div className="my-fav-badge">
                      🅿️ {park.PKLT_CHRG_YN === "Y" ? "유료" : "무료"} ·{" "}
                      {park.OPERT_BEGIN_TM && park.OPERT_END_TM
                        ? `${park.OPERT_BEGIN_TM}~${park.OPERT_END_TM}`
                        : "운영시간 정보 없음"}
                    </div>
                  )}
                </div>

                <div className="my-fav-actions">
                  <button
                    className="my-fav-btn my-fav-btn-primary"
                    onClick={() => onSelectFavorite(fav)}
                  >
                    길안내
                  </button>
                  <button
                    className="my-fav-btn my-fav-btn-ghost"
                    onClick={() => onRemoveFavorite(fav.parkId)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
