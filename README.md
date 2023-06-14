```bash
# 构建156
o j hro-front
or
o j hro-front 156

# 构建38 
o j hro-front 38

# 把hro-front 项目在38构建->deploy构建，并且修改 46环境配置文件
o j hro-front to 46,104 

# 把hro-front 项目在38构建->deploy构建，并且修改 46和104环境配置文件
o j hro-front to 46,104 

# hro-front 直接从deploy 构建，不走38构建，并修改 46和104环境配置文件
o j hro-front to 46,104 -n 38
```