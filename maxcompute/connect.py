# your_accesskey_id：具备目标MaxCompute项目中待操作对象相关操作权限的AccessKey ID。您可以进入AccessKey管理页面获取AccessKey ID。

# your_accesskey_secret：AccessKey ID对应的AccessKey Secret。您可以进入AccessKey管理页面获取AccessKey Secret。

# your_default_project：使用的MaxCompute项目名称。您可以登录MaxCompute控制台，左上角切换地域后，即可在项目管理页签查看到具体的MaxCompute项目名称。

# your_end_point：目标MaxCompute项目所在地域的Endpoint。详情请参见Endpoint。

#AccessKey ID LTAI5tCcf4RrsLzkAPESKjcJ

# AccessKey Secret vEFqzvPiWecMVkRUMqpqLVLZO6uUDe
# endPoint http://service.cn-hangzhou.maxcompute.aliyun.com/api
from odps import ODPS
odps = ODPS('LTAI5tCcf4RrsLzkAPESKjcJ', 'vEFqzvPiWecMVkRUMqpqLVLZO6uUDe', 'power137', endpoint='http://service.cn-hangzhou.maxcompute.aliyun.com/api')
for table in odps.list_tables():
  print(table)