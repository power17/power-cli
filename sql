--odps sql 
--********************************************************************--
--author:a727314657
--create time: 2023-07-16 11: 23: 13
--********************************************************************--
SELECT * FROM power137.power_monitor 
WHERE datetime = '20230716' AND eventtype = 'ERROR';

-- 查询pv
SELECT appid, pageid, datetime, COUNT(*) as pv
FROM power137.power_monitor 
WHERE datetime='20230716' AND eventtype='PV'
GROUP BY appid,pageid,datetime;  
-- 查询uv
SELECT appid, pageid, datetime, COUNT(DISTINCT visitor_id) as pv
FROM power137.power_monitor 
WHERE datetime='20230716' AND eventtype='PV'
GROUP BY appid,pageid,datetime; 
-- pv点击率
SELECT * FROM (
    SELECT appid, pageid, datetime, COUNT(*) AS  value, 'click' AS type
    FROM (
        SELECT t1.appid AS  appid, t1.pageid AS  pageid, t2.datetime AS  datetime
        FROM (
            SELECT appid, pageid, datetime, COUNT(*) AS  pv
            FROM power137.power_monitor 
            WHERE datetime='20230716' AND eventtype='PV'
            GROUP BY appid,pageid,datetime
        ) AS t1 LEFT JOIN power137.power_monitor AS  t2 ON t1.appid=t2.appid AND t1.pageid = t2.pageid
        WHERE t2.datetime='20230716' AND t2.eventtype='CLICK'

    ) AS  t1
    GROUP BY appid, pageid,datetime
) UNION ALL (
    SELECT appid, pageid, datetime, COUNT(*) as value, 'pv' AS type
    FROM power137.power_monitor 
    WHERE datetime='20230716' AND eventtype='PV'
    GROUP BY appid,pageid,datetime
);
-- pv点击率横表
SELECT (CONCAT((pv_click/pv * 100), '%') ) as pv_click_round
FROM (
    SELECT appid, pageid, datetime,pv,pv_click, pv_click/pv 
    FROM (
    SELECT appid, pageid, datetime,COUNT_IF(eventtype='CLICK') AS pv_click, COUNT_IF(eventtype='PV') as pv
    FROM (
        SELECT appid, pageid, datetime, eventtype
        FROM power137.power_monitor 
        WHERE datetime='20230716' AND (eventtype='PV' OR eventtype='CLICK')
    ) AS  t1
    GROUP BY appid, pageid, datetime
)
);
-- uv点击率横表
SELECT (CONCAT(uv_click/uv* 100, '%')) AS uv_click_round 
FROM (
    SELECT appid, pageid, datetime, COUNT_IF(uv_click > 0) as uv_click, COUNT(*) as uv
    FROM (
        SELECT appid, pageid, datetime,visitor_id,uv,uv_click, uv_click/uv 
        FROM (
        SELECT appid, pageid, datetime, visitor_id, COUNT_IF(eventtype='CLICK') AS uv_click, COUNT_IF(eventtype='PV') as uv
        FROM (
            SELECT appid, pageid, datetime, eventtype,visitor_id
            FROM power137.power_monitor 
            WHERE datetime='20230716' AND (eventtype='PV' OR eventtype='CLICK')
    ) AS  t1
    GROUP BY appid, pageid, datetime,visitor_id
)
) as t2
GROUP BY appid, pageid, datetime

);
-- 停留时长
SELECT appid, pageid, AVG(staytime) as staytime_arg
FROM (
    SELECT appid,pageid, datetime, GET_JSON_OBJECT(args, '$.stayTime') AS staytime 
    FROM power137.power_monitor
    WHERE datetime = '20230716' AND eventtype = 'STAY'
)
GROUP BY appid, pageid, staytime;

docker run -itd --name mysql -p 3306: 3306 -e MYSQL_ROOT_PASSWORD=power123... mysql

docker run --name mysql -p 3306: 3306 -e MYSQL_ROOT_PASSWORD=power123^&* -d mysql

CREATE USER 'root'@'%' IDENTIFIED BY 'power123456';

ALTER USER 'power'@'%' IDENTIFIED WITH mysql_native_password BY 'power123';
GRANT ALL PRIVILEGES ON *.* TO 'power'@'%';

//刷新权限
FLUSH PRIVILEGES;